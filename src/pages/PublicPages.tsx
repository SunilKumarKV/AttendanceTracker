import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Bell, GraduationCap, PlayCircle, ShieldCheck, UserCheck } from 'lucide-react';

const navLinks = [
  { label: 'Demo', to: '/demo' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Privacy', to: '/privacy' },
];

const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 rounded-xl" aria-label="AttendanceTracker home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <GraduationCap size={23} />
          </span>
          <span className="text-lg font-black">Attendance<span className="text-blue-600">Tracker</span></span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 sm:flex dark:text-slate-300" aria-label="Public navigation">
          {navLinks.map((item) => <Link key={item.to} to={item.to} className="hover:text-blue-600">{item.label}</Link>)}
        </nav>
        <Link to="/login" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Sign in</Link>
      </div>
    </header>
    {children}
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 AttendanceTracker</p>
        <div className="flex gap-5">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  </div>
);

export const LandingPage: React.FC = () => (
  <PublicShell>
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="mb-4 w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Attendance operations for colleges</p>
          <h1 className="max-w-full break-words text-4xl font-black leading-tight text-slate-950 sm:text-6xl dark:text-white">AttendanceTracker</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600 dark:text-slate-300">
            Manage students, professors, daily attendance, reports, and parent alerts from a focused academic operations dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">Open dashboard</Link>
            <Link to="/demo" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <PlayCircle size={20} />
              View demo
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-bold">Today</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300">Live</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="Present" value="84%" />
              <Metric label="Alerts" value="12" />
              <Metric label="Sessions" value="38" />
              <Metric label="Reports" value="Ready" />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <Feature icon={<UserCheck />} title="Fast Attendance" text="Professor workflows tuned for repeated daily marking." />
        <Feature icon={<BarChart3 />} title="Reports" text="Database-backed summaries, exports, and low-attendance views." />
        <Feature icon={<Bell />} title="Notifications" text="Delivery logs and provider-ready alert architecture." />
        <Feature icon={<ShieldCheck />} title="Role Access" text="Admin and professor routes guarded by real auth." />
      </section>
    </main>
  </PublicShell>
);

export const DemoPage: React.FC = () => (
  <PublicShell>
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-black">Product Demo</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">A guided walkthrough placeholder for admissions, department admins, and faculty coordinators.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {['Create classes and rosters', 'Mark and lock attendance', 'Export reports and alerts'].map((step, index) => (
          <div key={step} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-sm font-black text-blue-600">Step {index + 1}</span>
            <h2 className="mt-3 text-xl font-black">{step}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">This space is ready for screenshots or a hosted walkthrough video.</p>
          </div>
        ))}
      </div>
    </main>
  </PublicShell>
);

export const PricingPage: React.FC = () => (
  <PublicShell>
    <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-black">Pricing</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Pricing is currently customized by institution size and rollout needs.</p>
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-black uppercase tracking-widest text-blue-600">Placeholder</p>
        <h2 className="mt-3 text-3xl font-black">Institution Plan</h2>
        <p className="mt-2 text-slate-500">Includes admin dashboards, professor workflows, reporting, and notification architecture.</p>
      </div>
    </main>
  </PublicShell>
);

export const TermsPage: React.FC = () => <LegalPage title="Terms of Service" text="Use AttendanceTracker responsibly, protect account credentials, and ensure uploaded student data is handled with proper institutional authority." />;
export const PrivacyPage: React.FC = () => <LegalPage title="Privacy Policy" text="AttendanceTracker stores profile, attendance, report, and notification data for institutional operations. Production deployments should configure data retention, access controls, and approved providers." />;

const LegalPage: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <PublicShell>
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-black">{title}</h1>
      <div className="mt-8 space-y-5 rounded-3xl border border-slate-200 bg-white p-8 leading-8 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p>{text}</p>
        <p>This placeholder should be reviewed by legal counsel before a production launch.</p>
      </div>
    </main>
  </PublicShell>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-white/10 p-4">
    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black">{value}</p>
  </div>
);

const Feature: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10">{icon}</div>
    <h2 className="font-black">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
  </div>
);
