const express = require('express');
const Stripe = require('stripe');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PRICE_ID = process.env.STRIPE_PRICE_ID;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const FREE_INVOICE_LIMIT = 3;

// GET /api/stripe/status — get current plan
router.get('/status', auth, (req, res) => {
  const user = db.prepare('SELECT plan, stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?').get(req.user.id);
  const invoiceCount = db.prepare('SELECT COUNT(*) as c FROM invoices WHERE user_id = ?').get(req.user.id);
  res.json({
    plan: user.plan || 'free',
    invoiceCount: invoiceCount.c,
    invoiceLimit: FREE_INVOICE_LIMIT,
    canCreateInvoice: user.plan === 'pro' || invoiceCount.c < FREE_INVOICE_LIMIT,
  });
});

// POST /api/stripe/checkout — create Stripe checkout session
router.post('/checkout', auth, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: `${CLIENT_URL}/billing?success=1`,
      cancel_url: `${CLIENT_URL}/billing?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/portal — customer billing portal
router.post('/portal', auth, async (req, res) => {
  try {
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(req.user.id);
    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${CLIENT_URL}/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err.message);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

// POST /api/stripe/webhook — handle Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const getCustomerId = (obj) => obj?.customer;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'invoice.paid': {
      const customerId = getCustomerId(event.data.object);
      const subId = event.data.object.subscription || event.data.object.id;
      if (customerId) {
        db.prepare('UPDATE users SET plan = ?, stripe_subscription_id = ? WHERE stripe_customer_id = ?')
          .run('pro', subId || '', customerId);
        console.log(`Upgraded customer ${customerId} to pro`);
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = getCustomerId(event.data.object);
      if (customerId) {
        db.prepare('UPDATE users SET plan = ?, stripe_subscription_id = ? WHERE stripe_customer_id = ?')
          .run('free', '', customerId);
        console.log(`Downgraded customer ${customerId} to free`);
      }
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
