import React, { useEffect, useMemo, useState } from 'react';
import { Clipboard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { forgotPasswordRequest } from '../api/auth';
import { createInstitution, createInstitutionAdmin, getPlatformDashboard, Institution, InstitutionPayload, listInstitutions, updateInstitution, PlatformDashboardData, SubscriptionPlan } from '../api/platform';
import { InstitutionAdminForm } from './platform/InstitutionAdminForm';
import { InstitutionForm } from './platform/InstitutionForm';
import { InstitutionTable } from './platform/InstitutionTable';
import { PlatformStatsCards } from './platform/PlatformStatsCards';
import { emptyInstitutionForm, generateTemporaryPassword, type StatusFilter } from './platform/platformConstants';

export const PlatformDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<PlatformDashboardData | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [form, setForm] = useState<InstitutionPayload>(emptyInstitutionForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ institutionId: '', name: '', email: '', password: generateTemporaryPassword() });
  const [resetEmailByInstitution, setResetEmailByInstitution] = useState<Record<string, string>>({});
  const [lastOnboarding, setLastOnboarding] = useState<{ institutionCode: string; email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<'ALL' | SubscriptionPlan>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

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

  const filteredInstitutions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return institutions.filter((institution) => {
      const matchesSearch = !term || [institution.name, institution.code, institution.email ?? '', institution.contactPerson ?? ''].some((value) => value.toLowerCase().includes(term));
      const matchesPlan = planFilter === 'ALL' || institution.subscriptionPlan === planFilter;
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'SUSPENDED' ? !institution.isActive : institution.isActive && institution.subscriptionStatus === statusFilter);
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [institutions, planFilter, searchTerm, statusFilter]);

  const copyOnboarding = async () => {
    if (!lastOnboarding) return;
    const text = `AttendanceTracker login\nInstitution Code: ${lastOnboarding.institutionCode}\nEmail: ${lastOnboarding.email}\nTemporary Password: ${lastOnboarding.password}`;
    await navigator.clipboard.writeText(text);
    toast.success('Login credentials copied');
  };

  const submitInstitution = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateInstitution(editingId, form);
        toast.success('Institution updated');
      } else {
        const created = await createInstitution(form);
        setAdminForm((current) => ({ ...current, institutionId: created.data.id }));
        toast.success('Institution created. Now create the institution admin.');
      }
      setForm(emptyInstitutionForm);
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

  const toggleInstitutionStatus = async (institution: Institution) => {
    const nextActive = !institution.isActive;
    setUpdatingId(institution.id);
    try {
      await updateInstitution(institution.id, {
        isActive: nextActive,
        subscriptionStatus: nextActive ? 'ACTIVE' : 'CANCELLED',
      });
      toast.success(nextActive ? 'Institution activated' : 'Institution suspended');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update institution status');
    } finally {
      setUpdatingId(null);
    }
  };

  const sendResetLink = async (institution: Institution) => {
    const email = (resetEmailByInstitution[institution.id] ?? '').trim();
    if (!email) return toast.error('Enter the institution admin email first.');
    setResettingId(institution.id);
    try {
      await forgotPasswordRequest(email);
      toast.success(`Password reset link requested for ${email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request reset link');
    } finally {
      setResettingId(null);
    }
  };

  const submitAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adminForm.institutionId) return toast.error('Select an institution first');
    if (adminForm.password.length < 12) return toast.error('Temporary password must be at least 12 characters.');
    setSaving(true);
    try {
      await createInstitutionAdmin(adminForm.institutionId, { name: adminForm.name, email: adminForm.email, password: adminForm.password });
      const institutionCode = selectedInstitution?.code ?? '';
      setLastOnboarding({ institutionCode, email: adminForm.email, password: adminForm.password });
      setResetEmailByInstitution((current) => ({ ...current, [adminForm.institutionId]: adminForm.email }));
      toast.success('Institution admin created');
      setAdminForm({ institutionId: '', name: '', email: '', password: generateTemporaryPassword() });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create admin');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-black uppercase tracking-wider text-blue-600">Version 2.0 SaaS Platform</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Institution Management</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">Create institutions, manage subscription limits, and onboard institution admins with tenant-safe access.</p>
      </div>

      {lastOnboarding && (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Admin onboarding ready</p>
              <p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-100">Institution Code: {lastOnboarding.institutionCode} · Email: {lastOnboarding.email} · Temporary Password: {lastOnboarding.password}</p>
            </div>
            <button type="button" onClick={() => void copyOnboarding()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"><Clipboard size={16} /> Copy credentials</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border bg-white p-6 font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900"><Loader2 className="animate-spin" /> Loading platform data...</div>
      ) : (
        <PlatformStatsCards dashboard={dashboard} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <InstitutionForm
          form={form}
          editingId={editingId}
          saving={saving}
          onSubmit={submitInstitution}
          onChange={setForm}
          onCancelEdit={() => { setEditingId(null); setForm(emptyInstitutionForm); }}
        />

        <InstitutionAdminForm
          institutions={institutions}
          adminForm={adminForm}
          selectedInstitution={selectedInstitution}
          saving={saving}
          showPassword={showPassword}
          onSubmit={submitAdmin}
          onChange={setAdminForm}
          onTogglePassword={() => setShowPassword((value) => !value)}
        />
      </div>

      <InstitutionTable
        institutions={institutions}
        filteredInstitutions={filteredInstitutions}
        searchTerm={searchTerm}
        planFilter={planFilter}
        statusFilter={statusFilter}
        resetEmailByInstitution={resetEmailByInstitution}
        updatingId={updatingId}
        resettingId={resettingId}
        onSearchChange={setSearchTerm}
        onPlanFilterChange={setPlanFilter}
        onStatusFilterChange={setStatusFilter}
        onResetEmailChange={(institutionId, email) => setResetEmailByInstitution((current) => ({ ...current, [institutionId]: email }))}
        onSendResetLink={(institution) => void sendResetLink(institution)}
        onEdit={startEdit}
        onToggleStatus={(institution) => void toggleInstitutionStatus(institution)}
      />
    </div>
  );
};
