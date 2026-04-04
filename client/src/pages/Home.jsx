import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Scroll-triggered visibility hook ────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ── Animated counter ────────────────────────────────────────────── */
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    const dur = 1200;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── Feature card ────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay, inView }) {
  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.3s, translate 0.3s`,
      }}
    >
      <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-all duration-300">
        <span className="text-primary-600 dark:text-primary-400">{icon}</span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Step card ───────────────────────────────────────────────────── */
function Step({ num, title, desc, delay, inView }) {
  return (
    <div
      className="flex flex-col items-center text-center px-4"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      <div className="w-12 h-12 rounded-full bg-primary-600 text-white font-bold text-lg flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
        {num}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}

/* ── Mock invoice preview ────────────────────────────────────────── */
function MockInvoice() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 bg-primary-400/20 rounded-3xl blur-2xl" />
      {/* Floating badge */}
      <div className="absolute -top-4 -right-4 z-20 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
        ✓ Paid
      </div>
      {/* Card */}
      <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        {/* Blue header */}
        <div className="bg-primary-600 px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-primary-200 text-xs font-semibold uppercase tracking-wide mb-0.5">Invoice</p>
              <p className="text-white text-xl font-bold">#INV-0042</p>
            </div>
            <div className="text-right text-xs text-primary-200 space-y-0.5">
              <div>Issued: <span className="text-white font-medium">Apr 1, 2026</span></div>
              <div>Due: <span className="text-white font-medium">Apr 15, 2026</span></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Bill to */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">Sarah Johnson</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Acme Corp · sarah@acme.io</p>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            {[
              { desc: 'Brand Identity Design', amt: '$1,200.00' },
              { desc: 'Website UI/UX — 8 hrs', amt: '$960.00' },
              { desc: 'Revision rounds (×2)', amt: '$240.00' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{item.desc}</span>
                <span className="font-medium text-gray-900 dark:text-white">{item.amt}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">$2,400.00</span>
          </div>
        </div>
      </div>

      {/* Floating mini cards */}
      <div className="absolute -left-10 top-16 z-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 animate-float" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">PDF Ready</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Just now</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-8 bottom-16 z-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 animate-float" style={{ animationDelay: '1.2s' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">Email sent</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">2 min ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  // Navbar shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [featRef, featInView] = useInView();
  const [stepsRef, stepsInView] = useInView();
  const [statsRef, statsInView] = useInView(0.3);
  const [ctaRef, ctaInView] = useInView();

  const features = [
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      title: 'Professional Invoices',
      desc: 'Create beautiful, branded invoices in seconds. Add line items, taxes, and custom notes with ease.',
    },
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      title: 'Client Management',
      desc: 'Keep all your clients organized in one place. Store contact info, company details, and billing history.',
    },
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
      title: 'Instant PDF Export',
      desc: 'Download a polished PDF of any invoice with one click. Share it via email or save it for your records.',
    },
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      title: 'Email Delivery',
      desc: 'Send invoices directly to clients from within the app. No copy-pasting or switching tabs.',
    },
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
      title: 'Revenue Dashboard',
      desc: 'See your total revenue, outstanding balances, and overdue invoices at a glance on your dashboard.',
    },
    {
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
      title: 'Secure & Private',
      desc: 'Your financial data is encrypted and protected. Only you can access your invoices and client information.',
    },
  ];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-primary-500/40">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">InvoiceFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-40 dark:opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, #93c5fd 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Blobs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-300/30 dark:bg-primary-900/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: text */}
            <div>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
                style={{ animation: 'fadeInUp 0.5s ease both' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                Free invoicing for freelancers &amp; small businesses
              </div>

              <h1
                className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-6"
                style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}
              >
                Invoice smarter,<br />
                <span className="text-primary-600 dark:text-primary-400">get paid faster.</span>
              </h1>

              <p
                className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-md"
                style={{ animation: 'fadeInUp 0.5s ease 0.2s both' }}
              >
                Create professional invoices, manage clients, export PDFs, and track payments — all in one clean, simple tool built for people who work for themselves.
              </p>

              <div
                className="flex flex-wrap gap-3 mb-10"
                style={{ animation: 'fadeInUp 0.5s ease 0.3s both' }}
              >
                <Link to="/register" className="btn-primary px-6 py-3 text-base shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30">
                  Start for free
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                  Sign in
                </Link>
              </div>

              {/* Trust badges */}
              <div
                className="flex flex-wrap items-center gap-5 text-xs text-gray-400 dark:text-gray-500"
                style={{ animation: 'fadeInUp 0.5s ease 0.4s both' }}
              >
                {['No credit card required', 'Free forever plan', 'Setup in 60 seconds'].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: mock invoice */}
            <div
              className="hidden lg:flex justify-center items-center"
              style={{ animation: 'fadeInUp 0.6s ease 0.2s both' }}
            >
              <MockInvoice />
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full text-white dark:text-gray-900" preserveAspectRatio="none">
            <path d="M0 60L48 48C96 36 192 12 288 6C384 0 480 12 576 24C672 36 768 48 864 48C960 48 1056 36 1152 28.5C1248 21 1344 18 1392 16.5L1440 15V60H0Z" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 py-14" ref={statsRef}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: 500, suffix: '+', label: 'Freelancers using InvoiceFlow' },
              { value: 12000, suffix: '+', label: 'Invoices generated' },
              { value: 100, suffix: '%', label: 'Free to get started' },
            ].map(({ value, suffix, label }, i) => (
              <div
                key={i}
                style={{
                  opacity: statsInView ? 1 : 0,
                  transform: statsInView ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 120}ms, transform 0.5s ease ${i * 120}ms`,
                }}
              >
                <p className="text-4xl font-extrabold text-primary-600 dark:text-primary-400 tabular-nums">
                  <Counter to={value} suffix={suffix} />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-800/50 py-24" ref={featRef}>
        <div className="max-w-6xl mx-auto px-6">
          <div
            className="text-center mb-14"
            style={{
              opacity: featInView ? 1 : 0,
              transform: featInView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Built for the way you work</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
              Stop wrestling with spreadsheets or expensive software. InvoiceFlow gives you every tool you need — nothing you don't.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} delay={i * 80} inView={featInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-900 py-24" ref={stepsRef}>
        <div className="max-w-4xl mx-auto px-6">
          <div
            className="text-center mb-14"
            style={{
              opacity: stepsInView ? 1 : 0,
              transform: stepsInView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-3">Simple by design</p>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Up and running in minutes</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">No tutorials needed. InvoiceFlow is intuitive from the start.</p>
          </div>

          <div className="relative grid sm:grid-cols-3 gap-10">
            {/* Connecting line (desktop) */}
            <div
              className="hidden sm:block absolute top-6 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 dark:from-primary-900 dark:via-primary-700 dark:to-primary-900"
              style={{ opacity: stepsInView ? 1 : 0, transition: 'opacity 0.8s ease 0.4s' }}
            />
            {[
              { num: '1', title: 'Create your account', desc: 'Sign up free in under a minute — just your email, no credit card needed.' },
              { num: '2', title: 'Add clients & invoices', desc: 'Enter your client details, add line items, set your rate, and you\'re done.' },
              { num: '3', title: 'Send & get paid', desc: 'Email your invoice directly or export it as a PDF. Track status in real time.' },
            ].map((s, i) => (
              <Step key={i} {...s} delay={i * 150} inView={stepsInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden" ref={ctaRef}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-700/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div
          className="relative max-w-3xl mx-auto px-6 text-center"
          style={{
            opacity: ctaInView ? 1 : 0,
            transform: ctaInView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Ready to get paid<br />on time, every time?
          </h2>
          <p className="text-primary-200 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join hundreds of freelancers already using InvoiceFlow to streamline their billing and look more professional.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-lg text-base hover:bg-primary-50 active:scale-95 transition-all duration-200 shadow-xl shadow-primary-900/30"
            >
              Create your free account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-transparent text-white border border-white/40 font-semibold px-8 py-3.5 rounded-lg text-base hover:bg-white/10 active:scale-95 transition-all duration-200"
            >
              Sign in
            </Link>
          </div>
          <p className="text-primary-300 text-xs mt-6">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">InvoiceFlow</span>
          </div>
          <p className="text-gray-500 text-xs">© {new Date().getFullYear()} InvoiceFlow. Built for freelancers.</p>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <Link to="/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-gray-300 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
