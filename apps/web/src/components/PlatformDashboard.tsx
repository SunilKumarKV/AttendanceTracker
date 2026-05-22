import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Plus, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createInstitution, createInstitutionAdmin, getPlatformDashboard, Institution, InstitutionPayload, listInstitutions, updateInstitution, PlatformDashboardData, SubscriptionPlan, SubscriptionStatus } from '../api/platform';
import { MainLayout } from './MainLayout';

const emptyForm: InstitutionPayload = {
  name: '',
  code: '',
  email: '',
  phone: '',
  address: '',
  contactPerson: '',
  academicYear: '2026-27',
  subscriptionPlan: 'FREE_TRIAL',
  subscriptionStatus: 'TRIALING',
  studentLimit: 100,
  teacherLimit: 10,
  staffLimit: 10,
  isActive: true,
};

const plans: SubscriptionPlan[] = ['FREE_TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'];
const statuses: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];

export const PlatformDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<PlatformDashboardData | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState<InstitutionPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ institutionId: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [summary, list] = await Promise.all([getPlatformDashboard(), listInstitutions()]);
      setDashboard(summary.data);
      setInstitutions(list.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedInstitution = useMemo(() => institutions.find((item) => item.id === adminForm.institutionId), [adminForm.institutionId, institutions]);

  const submitInstitution = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateInstitution(editingId, form);
        toast.success('Institution updated');
      } else {
        await createInstitution(form);
        toast.success('Institution created');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save institution');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (institution: Institution) => {
    setEditingId(institution.id);
    setForm({
      name: institution.name,
      code: institution.code,
      logoUrl: institution.logoUrl ?? '',
      email: institution.email ?? '',
      phone: institution.phone ?? '',
      address: institution.address ?? '',
      contactPerson: institution.contactPerson ?? '',
      academicYear: institution.academicYear ?? '2026-27',
      subscriptionPlan: institution.subscriptionPlan,
      subscriptionStatus: institution.subscriptionStatus,
      studentLimit: institution.studentLimit,
      teacherLimit: institution.teacherLimit,
      staffLimit: institution.staffLimit,
      isActive: institution.isActive,
    });
  };

  const submitAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminForm.institutionId) return toast.error('Select an institution first');
    setSaving(true);
    try {
      await createInstitutionAdmin(adminForm.institutionId, { name: adminForm.name, email: adminForm.email, password: adminForm.password });
      toast.success('Institution admin created');
      setAdminForm({ institutionId: '', name: '', email: '', password: '' });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create admin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-black uppercase tracking-wider text-blue-600">Version 2.0 SaaS Platform</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Institution Management</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Create institutions, manage subscription limits, and onboard institution admins with tenant-safe access.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border bg-white p-6 font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900"><Loader2 className="animate-spin" /> Loading platform data...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            {[{ label: 'Institutions', value: dashboard?.totalInstitutions ?? 0, icon: Building2 }, { label: 'Active', value: dashboard?.activeInstitutions ?? 0, icon: ShieldCheck }, { label: 'Users', value: dashboard?.totalUsers ?? 0, icon: Users }, { label: 'Students', value: dashboard?.totalStudents ?? 0, icon: Users }].map((card) => (
              <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <card.icon className="mb-3 text-blue-600" />
                <p className="text-sm font-bold text-slate-500">{card.label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <form onSubmit={submitInstitution} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{editingId ? 'Edit Institution' : 'Create Institution'}</h2>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="text-sm font-bold text-slate-500 hover:text-blue-600">Cancel edit</button>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input required placeholder="Institution name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-xl border p-3 uppercase dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Academic year" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <select value={form.subscriptionPlan} onChange={(e) => setForm({ ...form, subscriptionPlan: e.target.value as SubscriptionPlan })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">{plans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}</select>
              <select value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value as SubscriptionStatus })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
              <input type="number" min={1} placeholder="Student limit" value={form.studentLimit} onChange={(e) => setForm({ ...form, studentLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input type="number" min={1} placeholder="Teacher limit" value={form.teacherLimit} onChange={(e) => setForm({ ...form, teacherLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input type="number" min={1} placeholder="Staff limit" value={form.staffLimit} onChange={(e) => setForm({ ...form, staffLimit: Number(e.target.value) })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input placeholder="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} className="rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <textarea placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="md:col-span-2 rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:bg-blue-300"><Plus size={18} /> {editingId ? 'Save Institution' : 'Create Institution'}</button>
          </form>

          <form onSubmit={submitAdmin} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-5 text-xl font-black">Create Institution Admin</h2>
            <div className="space-y-4">
              <select required value={adminForm.institutionId} onChange={(e) => setAdminForm({ ...adminForm, institutionId: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950">
                <option value="">Select institution</option>
                {institutions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
              </select>
              <input required placeholder="Admin name" value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input required type="email" placeholder="Admin email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              <input required type="password" minLength={8} placeholder="Temporary password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} className="w-full rounded-xl border p-3 dark:border-slate-700 dark:bg-slate-950" />
              {selectedInstitution && <p className="rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">Admin will be scoped to {selectedInstitution.name}. They cannot access another institution.</p>}
            </div>
            <button disabled={saving} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-black text-white disabled:bg-slate-400 dark:bg-white dark:text-slate-900">Create Admin</button>
          </form>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800"><h2 className="text-xl font-black">Institutions</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950"><tr><th className="p-4">Institution</th><th className="p-4">Plan</th><th className="p-4">Status</th><th className="p-4">Usage</th><th className="p-4">Limits</th><th className="p-4">Action</th></tr></thead>
              <tbody>
                {institutions.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-4"><p className="font-black">{item.name}</p><p className="text-xs font-bold text-slate-500">{item.code} · {item.email || 'No email'}</p></td>
                    <td className="p-4 font-bold">{item.subscriptionPlan}</td>
                    <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{item.subscriptionStatus}</span></td>
                    <td className="p-4 text-xs font-bold text-slate-500">Users {item._count?.users ?? 0}<br />Students {item._count?.students ?? 0}<br />Teachers {item._count?.professorProfiles ?? 0}</td>
                    <td className="p-4 text-xs font-bold text-slate-500">Students {item.studentLimit}<br />Teachers {item.teacherLimit}<br />Staff {item.staffLimit}</td>
                    <td className="p-4"><button onClick={() => startEdit(item)} className="rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-200">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
