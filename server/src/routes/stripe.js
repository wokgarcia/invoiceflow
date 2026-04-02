const express = require('express');
const Stripe = require('stripe');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const PRICE_ID = process.env.STRIPE_PRICE_ID;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const FREE_INVOICE_LIMIT = 3;

// GET /api/stripe/status
router.get('/status', auth, async (req, res) => {
  try {
    const userResult = await db.query('SELECT plan, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const countResult = await db.query('SELECT COUNT(*) as c FROM invoices WHERE user_id = $1', [req.user.id]);
    const invoiceCount = parseInt(countResult.rows[0].c);
    res.json({
      plan: user.plan || 'free',
      invoiceCount,
      invoiceLimit: FREE_INVOICE_LIMIT,
      canCreateInvoice: user.plan === 'pro' || invoiceCount < FREE_INVOICE_LIMIT,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /api/stripe/checkout
router.post('/checkout', auth, async (req, res) => {
  try {
    const userResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
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

// POST /api/stripe/portal
router.post('/portal', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user.stripe_customer_id) return res.status(400).json({ error: 'No billing account found' });
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

// POST /api/stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const getCustomerId = (obj) => obj?.customer;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'invoice.paid': {
        const customerId = getCustomerId(event.data.object);
        const subId = event.data.object.subscription || event.data.object.id;
        if (customerId) {
          await db.query('UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE stripe_customer_id = $3', ['pro', subId || '', customerId]);
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const customerId = getCustomerId(event.data.object);
        if (customerId) {
          await db.query('UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE stripe_customer_id = $3', ['free', '', customerId]);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook db error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
