import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Settings, UserCog } from 'lucide-react';
import { EmptyState } from './common';

export const TeacherSettings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10"><Settings size={24} /></div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Panel</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Manage account preferences available to teacher accounts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <button type="button" onClick={() => navigate('/teacher-profile')} className="rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
          <UserCog className="mb-4 text-blue-600" size={28} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Profile and Password</h3>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Update profile information and change your password.</p>
        </button>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Moon className="mb-4 text-blue-600" size={28} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Theme</h3>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Use the header theme button to switch between light and dark mode.</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Bell className="mb-4 text-blue-600" size={28} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h3>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Delivery rules are managed by administrators for your institution.</p>
        </div>
      </div>

      <div className="mt-8">
        <EmptyState title="No teacher-only institution settings" message="Institution-wide settings are controlled by administrators to keep academic rules consistent." />
      </div>
    </div>
  );
};

export const ProfessorSettings = TeacherSettings;
