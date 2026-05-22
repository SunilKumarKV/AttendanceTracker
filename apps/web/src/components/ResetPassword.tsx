import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Loader2, Lock } from 'lucide-react';
import { resetPasswordRequest } from '../api/auth';

export const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('Reset token is missing. Use the link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
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
        <h1 className="text-3xl font-black">Reset password</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Set a new password with at least 8 characters, uppercase, lowercase, and number.</p>
        <form onSubmit={submit} className="mt-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
          <div className="space-y-5">
            <PasswordInput label="New Password" value={password} onChange={setPassword} />
            <PasswordInput label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} />
          </div>
          {success && <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Password reset successfully. Redirecting to login...</div>}
          {error && <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</div>}
          <button type="submit" disabled={loading || success} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400">
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            Reset password
          </button>
        </form>
      </div>
    </main>
  );
};

const PasswordInput: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</label>
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input type="password" required minLength={8} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950" />
    </div>
  </div>
);
