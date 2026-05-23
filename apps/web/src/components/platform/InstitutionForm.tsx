import React from 'react';
import { Plus } from 'lucide-react';
import type { InstitutionPayload, SubscriptionPlan } from '../../api/platform';
import { emptyInstitutionForm, platformPlans, platformStatuses } from './platformConstants';

interface InstitutionFormProps {
  form: InstitutionPayload;
  editingId: string | null;
  saving: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (form: InstitutionPayload) => void;
  onCancelEdit: () => void;
}

export const InstitutionForm: React.FC<InstitutionFormProps> = ({
  form,
  editingId,
  saving,
  onSubmit,
  onChange,
  onCancelEdit,
}) => (
  <form onSubmit={onSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-xl font-black">{editingId ? 'Edit Institution' : 'Create Institution'}</h2>
      {editingId && <button type="button" onClick={onCancelEdit} className="text-sm font-bold text-slate-500 hover:text-blue-600">Cancel edit</button>}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <input required placeholder="Institution name" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Code" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value.toUpperCase() })} className="rounded-xl border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Email" type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Phone" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Contact person" value={form.contactPerson} onChange={(e) => onChange({ ...form, contactPerson: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Academic year" value={form.academicYear} onChange={(e) => onChange({ ...form, academicYear: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <select value={form.subscriptionPlan} onChange={(e) => onChange({ ...form, subscriptionPlan: e.target.value as SubscriptionPlan })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">{platformPlans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select>
      <select value={form.subscriptionStatus} onChange={(e) => onChange({ ...form, subscriptionStatus: e.target.value as InstitutionPayload['subscriptionStatus'] })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">{platformStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      <input type="number" min={1} placeholder="Student limit" value={form.studentLimit} onChange={(e) => onChange({ ...form, studentLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input type="number" min={1} placeholder="Teacher limit" value={form.teacherLimit} onChange={(e) => onChange({ ...form, teacherLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input type="number" min={1} placeholder="Staff limit" value={form.staffLimit} onChange={(e) => onChange({ ...form, staffLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <input placeholder="Logo URL" value={form.logoUrl} onChange={(e) => onChange({ ...form, logoUrl: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
      <textarea placeholder="Address" value={form.address} onChange={(e) => onChange({ ...form, address: e.target.value })} className="md:col-span-2 rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
    </div>
    <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:bg-blue-300"><Plus size={18} /> {editingId ? 'Save Institution' : 'Create Institution'}</button>
  </form>
);

export const resetInstitutionForm = emptyInstitutionForm;
