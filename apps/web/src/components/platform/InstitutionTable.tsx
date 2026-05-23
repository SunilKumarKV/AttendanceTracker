import React from 'react';
import { Eye, KeyRound, Search } from 'lucide-react';
import type { Institution, SubscriptionPlan } from '../../api/platform';
import { platformPlans, platformStatuses, planStyles, progressWidth, statusStyles, type StatusFilter } from './platformConstants';

interface InstitutionTableProps {
  institutions: Institution[];
  filteredInstitutions: Institution[];
  searchTerm: string;
  planFilter: 'ALL' | SubscriptionPlan;
  statusFilter: StatusFilter;
  resetEmailByInstitution: Record<string, string>;
  updatingId: string | null;
  resettingId: string | null;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: 'ALL' | SubscriptionPlan) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onResetEmailChange: (institutionId: string, email: string) => void;
  onSendResetLink: (institution: Institution) => void;
  onView: (institution: Institution) => void;
  onEdit: (institution: Institution) => void;
  onToggleStatus: (institution: Institution) => void;
}

export const InstitutionTable: React.FC<InstitutionTableProps> = ({
  institutions,
  filteredInstitutions,
  searchTerm,
  planFilter,
  statusFilter,
  resetEmailByInstitution,
  updatingId,
  resettingId,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
  onResetEmailChange,
  onSendResetLink,
  onView,
  onEdit,
  onToggleStatus,
}) => (
  <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="border-b border-slate-100 p-5 dark:border-slate-800">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-black">Institutions</h2>
          <p className="text-sm font-bold text-slate-500">Showing {filteredInstitutions.length} of {institutions.length}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search institution..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <select value={planFilter} onChange={(event) => onPlanFilterChange(event.target.value as 'ALL' | SubscriptionPlan)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
            <option value="ALL">All plans</option>
            {platformPlans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950">
            <option value="ALL">All statuses</option>
            {platformStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
        </div>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
          <tr><th className="p-4">Institution</th><th className="p-4">Plan</th><th className="p-4">Status</th><th className="p-4">Usage</th><th className="p-4">Admin Reset</th><th className="p-4">Action</th></tr>
        </thead>
        <tbody>
          {filteredInstitutions.map((item) => {
            const students = item._count?.students ?? 0;
            const teachers = item._count?.professorProfiles ?? 0;
            return (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-4"><p className="font-black">{item.name}</p><p className="text-xs font-bold text-slate-500">{item.code} · {item.email || 'No email'}</p></td>
                <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${planStyles[item.subscriptionPlan]}`}>{item.subscriptionPlan}</span></td>
                <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.isActive ? statusStyles[item.subscriptionStatus] : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>{item.isActive ? item.subscriptionStatus : 'SUSPENDED'}</span></td>
                <td className="p-4 text-xs font-bold text-slate-500">
                  <div className="space-y-2">
                    <div><div className="mb-1 flex justify-between"><span>Students</span><span>{students}/{item.studentLimit}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-blue-600" style={{ width: progressWidth(students, item.studentLimit) }} /></div></div>
                    <div><div className="mb-1 flex justify-between"><span>Teachers</span><span>{teachers}/{item.teacherLimit}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-violet-600" style={{ width: progressWidth(teachers, item.teacherLimit) }} /></div></div>
                    <p>Users {item._count?.users ?? 0}</p>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex min-w-[250px] gap-2">
                    <input type="email" value={resetEmailByInstitution[item.id] ?? ''} onChange={(event) => onResetEmailChange(item.id, event.target.value)} placeholder="admin@email.com" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-950" />
                    <button disabled={resettingId === item.id} onClick={() => onSendResetLink(item)} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-950/40 dark:text-amber-300"><KeyRound size={14} /> {resettingId === item.id ? 'Sending...' : 'Reset'}</button>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onView(item)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"><Eye size={14} /> View</button>
                    <button onClick={() => onEdit(item)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-200">Edit</button>
                    <button disabled={updatingId === item.id} onClick={() => onToggleStatus(item)} className={`rounded-lg px-3 py-2 font-bold disabled:opacity-60 ${item.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{updatingId === item.id ? 'Updating...' : item.isActive ? 'Suspend' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredInstitutions.length === 0 && (
            <tr><td colSpan={6} className="p-8 text-center text-sm font-bold text-slate-500">No institutions match your filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
