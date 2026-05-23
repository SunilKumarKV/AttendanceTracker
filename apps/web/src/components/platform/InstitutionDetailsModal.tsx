import React from 'react';
import { X } from 'lucide-react';
import type { Institution } from '../../api/platform';
import { planStyles, progressWidth, statusStyles } from './platformConstants';

interface InstitutionDetailsModalProps {
  institution: Institution | null;
  onClose: () => void;
}

export const InstitutionDetailsModal: React.FC<InstitutionDetailsModalProps> = ({ institution, onClose }) => {
  if (!institution) return null;

  const students = institution._count?.students ?? 0;
  const teachers = institution._count?.professorProfiles ?? 0;
  const users = institution._count?.users ?? 0;
  const staff = institution._count?.staffMembers ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">Institution details</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{institution.name}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">{institution.code}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900" aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <p className="text-xs font-black uppercase text-slate-400">Plan</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${planStyles[institution.subscriptionPlan]}`}>{institution.subscriptionPlan}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <p className="text-xs font-black uppercase text-slate-400">Status</p>
            <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${institution.isActive ? statusStyles[institution.subscriptionStatus] : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>{institution.isActive ? institution.subscriptionStatus : 'SUSPENDED'}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <p className="text-xs font-black uppercase text-slate-400">Academic year</p>
            <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">{institution.academicYear || 'Not set'}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">Usage</h3>
            <div className="space-y-4 text-sm font-bold text-slate-500">
              <div><div className="mb-1 flex justify-between"><span>Students</span><span>{students}/{institution.studentLimit}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-blue-600" style={{ width: progressWidth(students, institution.studentLimit) }} /></div></div>
              <div><div className="mb-1 flex justify-between"><span>Teachers</span><span>{teachers}/{institution.teacherLimit}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-violet-600" style={{ width: progressWidth(teachers, institution.teacherLimit) }} /></div></div>
              <div><div className="mb-1 flex justify-between"><span>Staff</span><span>{staff}/{institution.staffLimit}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-600" style={{ width: progressWidth(staff, institution.staffLimit) }} /></div></div>
              <p>Total active users: <span className="text-slate-900 dark:text-white">{users}</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">Contact</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-black text-slate-400">Email:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{institution.email || 'Not set'}</span></p>
              <p><span className="font-black text-slate-400">Phone:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{institution.phone || 'Not set'}</span></p>
              <p><span className="font-black text-slate-400">Contact person:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{institution.contactPerson || 'Not set'}</span></p>
              <p><span className="font-black text-slate-400">Address:</span> <span className="font-bold text-slate-700 dark:text-slate-200">{institution.address || 'Not set'}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">Subscription</h3>
            <div className="space-y-3 text-sm font-bold text-slate-600 dark:text-slate-300">
              <p>Trial ends: {institution.trialEndsAt ? new Date(institution.trialEndsAt).toLocaleDateString() : 'Not set'}</p>
              <p>Created: {new Date(institution.createdAt).toLocaleDateString()}</p>
              <p>Updated: {new Date(institution.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">Limits</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xl font-black">{institution.studentLimit}</p><p className="text-xs font-bold text-slate-500">Students</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xl font-black">{institution.teacherLimit}</p><p className="text-xs font-bold text-slate-500">Teachers</p></div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-xl font-black">{institution.staffLimit}</p><p className="text-xs font-bold text-slate-500">Staff</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
