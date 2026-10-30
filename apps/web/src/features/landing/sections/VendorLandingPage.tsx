import { ArrowRight, BadgeCheck, Banknote, ClipboardCheck, MapPin, ShieldCheck, Store, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_INITIAL, APP_NAME } from '../../../config/brand';
import { AUTH_ROUTES, ROLE } from '../../auth/constants';
import '../landing.css';

const sections = [
  { id: 'benefits', label: 'Benefits' },
  { id: 'steps', label: 'How it works' },
  { id: 'fees', label: 'Fees & payouts' },
  { id: 'verification', label: 'Verification' },
  { id: 'faq', label: 'FAQ' }
];

const benefits = [
  { icon: Users, title: 'Reach nearby customers', text: 'Help people in Minna and Niger State find your services or shop.' },
  { icon: Store, title: 'Show what you offer', text: 'Create a profile for your trade, services, products and working hours.' },
  { icon: ClipboardCheck, title: 'Manage work in one place', text: 'Keep requests, bookings and customer updates together in your vendor portal.' },
  { icon: ShieldCheck, title: 'Build trust over time', text: 'Share your details for verification and let completed work speak through reviews.' }
];

const steps = [
  { title: 'Create your account', text: 'Sign up as a provider and tell us about your business.' },
  { title: 'Complete your profile', text: 'Add your services or products, location, hours and contact details.' },
  { title: 'Receive and manage requests', text: 'When your profile is ready, customers can discover and contact you.' }
];

const faqs = [
  { question: 'Who can join?', answer: 'Local service providers and shops serving customers in Niger State can create a profile.' },
  { question: 'Do I need to finish my profile?', answer: 'Yes. Add the business information and documents requested during setup so your profile can be reviewed.' },
  { question: 'How do I get started?', answer: 'Create a provider account, complete your profile and follow the verification steps shown in the portal.' }
];

const button = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-pine px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-pine-deep focus:outline-none focus-visible:ring-4 focus-visible:ring-pine/25';
const signup = AUTH_ROUTES.signupFor(ROLE.Provider);

export function VendorLandingPage() {
  return (
    <div className="min-h-screen bg-cream pb-24 font-sans text-ink md:pb-0">
      <header className="sticky top-0 z-50 border-b border-line bg-cream shadow-sm">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40" aria-label={APP_NAME}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mustard text-lg font-extrabold text-ink" aria-hidden="true">{APP_INITIAL}</span>
            <span className="hidden max-w-40 text-sm font-extrabold leading-tight sm:block">{APP_NAME}</span>
          </Link>
          <nav aria-label="Page sections" className="hidden items-center gap-5 lg:flex">
            {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="text-sm font-medium text-muted transition hover:text-pine">{section.label}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Link to={AUTH_ROUTES.login} className="rounded-lg px-2 py-2 text-sm font-semibold text-pine hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pine/40">Login</Link>
            <Link to={signup} className={`${button} min-h-10 px-4 py-2 text-sm`}>Become a Vendor</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-pine"><MapPin className="h-4 w-4" aria-hidden="true" /> For local businesses in Niger State</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-pine-deep sm:text-5xl lg:text-6xl">Grow your business with customers nearby.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">Bring your services or products to ZAMANI NG MARKET HUB. Set up your profile and make it easier for local customers to find you.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={signup} className={button}>Become a Vendor <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
              <a href="#steps" className="rounded-lg px-3 py-3 font-semibold text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine">See how it works</a>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand text-pine"><Store className="h-7 w-7" aria-hidden="true" /></div>
            <h2 className="mt-6 text-2xl font-bold text-pine-deep">Your work deserves to be found.</h2>
            <p className="mt-3 leading-relaxed text-muted">Build a clear local profile, keep your catalogue up to date and manage customer requests from your vendor portal.</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-sm font-semibold text-pine">
              <div className="rounded-xl bg-cream p-4">Services and products</div>
              <div className="rounded-xl bg-cream p-4">Requests in one place</div>
              <div className="rounded-xl bg-cream p-4">Your business profile</div>
              <div className="rounded-xl bg-cream p-4">Customer reviews</div>
            </div>
          </div>
        </section>

        <section id="benefits" className="scroll-mt-24 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-pine">Made for local business</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-pine-deep sm:text-4xl">A simpler way to show up online.</h2></div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-line bg-cream p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-pine"><Icon className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-lg font-bold text-pine-deep">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="steps" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-wider text-pine">Get started</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-pine-deep sm:text-4xl">How it works</h2></div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-line bg-white p-6 sm:p-8"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-pine text-lg font-bold text-white">{index + 1}</span><h3 className="mt-5 text-xl font-bold text-pine-deep">{step.title}</h3><p className="mt-2 leading-relaxed text-muted">{step.text}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="fees" className="scroll-mt-24 bg-pine-deep py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
            <div><p className="text-sm font-bold uppercase tracking-wider text-white/70">Clear information</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Fees and payouts, in plain words.</h2><p className="mt-4 max-w-xl leading-relaxed text-white/80">Your plan and any applicable marketplace charges are shown in your account before you commit. Review the amount and terms there; payouts are sent using the payment details you provide.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 sm:p-8"><Banknote className="h-7 w-7 text-white" aria-hidden="true" /><h3 className="mt-4 text-xl font-bold">Know what to expect</h3><p className="mt-2 leading-relaxed text-white/80">Check your subscription, transaction details and payout status in the vendor portal. No payout timing or fee is promised here; the applicable terms are shown during setup and in your account.</p></div>
          </div>
        </section>

        <section id="verification" className="scroll-mt-24 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
            <div><p className="text-sm font-bold uppercase tracking-wider text-pine">Trust starts with clear details</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-pine-deep sm:text-4xl">A straightforward verification process.</h2><p className="mt-4 leading-relaxed text-muted">We ask for business and identity details so the team can review your profile. You can see the status and any next steps in your portal.</p></div>
            <ol className="space-y-4">
              {['Create your provider profile with accurate contact and business details.', 'Upload the documents requested for your business and identity.', 'Check your verification page for review updates or any information still needed.'].map((step, index) => <li key={step} className="flex gap-4 rounded-2xl border border-line bg-cream p-5"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-pine">{index + 1}</span><span className="leading-relaxed text-ink">{step}</span></li>)}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <div className="text-center"><BadgeCheck className="mx-auto h-8 w-8 text-pine" aria-hidden="true" /><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-pine-deep">A few quick answers</h2></div>
            <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white px-6">
              {faqs.map((faq) => <details key={faq.question} className="py-5"><summary className="cursor-pointer font-bold text-pine-deep marker:text-pine">{faq.question}</summary><p className="mt-3 leading-relaxed text-muted">{faq.answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className="bg-sand px-4 py-14 text-center sm:py-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-pine-deep sm:text-4xl">Ready to bring your business online?</h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">Create your provider account and take the next step at your own pace.</p>
          <Link to={signup} className={`${button} mt-7`}>Become a Vendor <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className="border-t border-line bg-white px-4 py-6 text-center text-sm text-muted"><span>{APP_NAME}</span><span className="mx-2" aria-hidden="true">·</span><Link to={AUTH_ROUTES.login} className="font-semibold text-pine underline underline-offset-2">Vendor login</Link></footer>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(28,27,24,0.08)] md:hidden"><Link to={signup} className={`${button} w-full`}>Become a Vendor <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link></div>
    </div>
  );
}
