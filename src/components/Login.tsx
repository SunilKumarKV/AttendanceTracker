import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export const Login: React.FC = () => {
  const [role, setRole] = useState<Role>('Professor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Check password based on requirements
    const validPassword = role === 'Admin' ? 'admin123' : 'prof123';
    
    if (password !== validPassword) {
      setError('Invalid credentials for the selected role.');
      return;
    }

    const success = login(email, role);
    if (success) {
      if (role === 'Admin') {
        navigate('/dashboard');
      } else {
        navigate('/mark-attendance');
      }
    } else {
      setError('Invalid email for the selected role.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <GraduationCap className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Attendance<span className="text-blue-600">Pro</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">College Management System</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setRole('Admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                role === 'Admin'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck size={20} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole('Professor')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                role === 'Professor'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap size={20} />
              Professor
            </button>
          </div>

          <div className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. prof@college.edu"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm py-2.5 px-4 rounded-lg border border-red-100 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            Login to Account
          </button>

          <div className="text-center">
            <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Forgot password?
            </a>
          </div>
        </form>
      </div>

      <p className="mt-8 text-slate-400 text-sm font-medium">
        &copy; 2026 AttendanceTracker. All rights reserved.
      </p>
    </div>
  );
};
