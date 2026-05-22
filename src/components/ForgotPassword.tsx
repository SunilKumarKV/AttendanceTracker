import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Loader2, Mail } from 'lucide-react';
import { forgotPasswordRequest } from '../api/auth';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await forgotPasswordRequest(email);
      setMessage(response.message ?? 'If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link to="/login" className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl text-sm font-bold text-slate-500 hover:text-blue-600">
          <ArrowLeft size={18} /> Back to login
        </Link>
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-3xl font-black">Forgot password</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Enter your registered email. We will send a secure reset link if the account exists.</p>
        <form onSubmit={submit} className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
          <label htmlFor="reset-email" className="text-sm font-bold text-slate-700 dark:text-slate-200">Email Address</label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          {message && <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}
          {error && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400">
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            Send reset link
          </button>
        </form>
      </div>
    </main>
  );
};
