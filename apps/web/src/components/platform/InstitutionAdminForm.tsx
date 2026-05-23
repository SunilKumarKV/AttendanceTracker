import React from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import type { Institution } from '../../api/platform';
import { generateTemporaryPassword } from './platformConstants';

export interface InstitutionAdminFormState {
  institutionId: string;
  name: string;
  email: string;
  password: string;
}

interface InstitutionAdminFormProps {
  institutions: Institution[];
  adminForm: InstitutionAdminFormState;
  selectedInstitution?: Institution;
  saving: boolean;
  showPassword: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (form: InstitutionAdminFormState) => void;
  onTogglePassword: () => void;
}

export const InstitutionAdminForm: React.FC<InstitutionAdminFormProps> = ({
  institutions,
  adminForm,
  selectedInstitution,
  saving,
  showPassword,
  onSubmit,
  onChange,
  onTogglePassword,
}) => (
  <form onSubmit={onSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="mb-5 text-xl font-black">Create Institution Admin</h2>
    <div className="space-y-4">
      <select required value={adminForm.institutionId} onChange={(e) => onChange({ ...adminForm, institutionId: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">
        <option value="">Select institution</option>
        {institutions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
      </select>
      <input required placeholder="Admin name" value={adminForm.name} onChange={(e) => onChange({ ...adminForm, name: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input required type="email" placeholder="Admin email" value={adminForm.email} onChange={(e) => onChange({ ...adminForm, email: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <div className="flex gap-2">
        <input required type={showPassword ? 'text' : 'password'} minLength={12} placeholder="Temporary password" value={adminForm.password} onChange={(e) => onChange({ ...adminForm, password: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
        <button type="button" onClick={onTogglePassword} className="rounded-xl border px-3 dark:border-slate-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      <button type="button" onClick={() => onChange({ ...adminForm, password: generateTemporaryPassword() })} className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Sparkles size={16} /> Generate secure password</button>
      {selectedInstitution && <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Admin will be scoped to {selectedInstitution.name}. They cannot access another institution.</p>}
    </div>
    <button disabled={saving} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-black text-white disabled:bg-slate-400 dark:bg-white dark:text-slate-900">Create Admin</button>
  </form>
);
