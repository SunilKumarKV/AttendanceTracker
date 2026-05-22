import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, GraduationCap, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      toast.success('Welcome back.');
      navigate(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'HOD' ? '/dashboard' : '/professor-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[1fr_0.92fr]">
        <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
          <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white">
            <ArrowLeft size={18} />
            Back to site
          </Link>
          <div>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
              <GraduationCap size={38} />
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-tight">Run attendance operations with fewer loose ends.</h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Use real authentication, role-aware dashboards, reports, alerts, and settings from one workspace.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {['Super Admin', 'Admin', 'Teacher'].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm font-black text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <main className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
          <Link to="/" className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl text-sm font-bold text-slate-500 hover:text-blue-600 lg:hidden">
            <ArrowLeft size={18} />
            Back
          </Link>
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <GraduationCap size={32} />
              </div>
              <h1 className="text-3xl font-black">Sign in to AttendanceTracker</h1>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Use your admin or teacher account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-200">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@college.edu"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-slate-200">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-900/50 dark:bg-red-950/30">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="mt-5 text-center text-sm font-semibold text-slate-500">
                Forgot password? Contact your institution administrator.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
