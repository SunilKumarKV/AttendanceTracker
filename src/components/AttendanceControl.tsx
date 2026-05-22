import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveCorrectionRequest,
  approveLeaveRequest,
  AttendancePolicy,
  AttendanceReviewRequest,
  createHoliday,
  deleteHoliday,
  getAttendancePolicy,
  getCorrectionRequests,
  getHolidays,
  getLeaveRequests,
  Holiday,
  LeaveRequest,
  rejectCorrectionRequest,
  rejectLeaveRequest,
  updateAttendancePolicy,
} from '../api/admin';
import { EmptyState, ErrorState, Loader } from './common';

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayValue = () => new Date().toISOString().slice(0, 10);
const defaultPolicy: AttendancePolicy = { id: '', lockAfterHours: 24, workingDays: [1, 2, 3, 4, 5, 6], adminOverrideEnabled: true };

export const AttendanceControl: React.FC = () => {
  const [policy, setPolicy] = useState<AttendancePolicy>(defaultPolicy);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [corrections, setCorrections] = useState<AttendanceReviewRequest[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [holidayForm, setHolidayForm] = useState({ date: todayValue(), name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [policyRes, holidayRes, correctionRes, leaveRes] = await Promise.all([
        getAttendancePolicy(),
        getHolidays(),
        getCorrectionRequests('PENDING'),
        getLeaveRequests('PENDING'),
      ]);
      setPolicy(policyRes.data);
      setHolidays(holidayRes.data);
      setCorrections(correctionRes.data);
      setLeaves(leaveRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance controls.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const savePolicy = async () => {
    setSaving(true);
    try {
      const response = await updateAttendancePolicy({ lockAfterHours: Number(policy.lockAfterHours), workingDays: policy.workingDays, adminOverrideEnabled: policy.adminOverrideEnabled });
      setPolicy(response.data);
      toast.success('Attendance policy updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update policy.');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!holidayForm.name.trim()) return toast.error('Holiday name is required.');
    setSaving(true);
    try {
      await createHoliday(holidayForm);
      setHolidayForm({ date: todayValue(), name: '', description: '' });
      toast.success('Holiday saved.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save holiday.');
    } finally {
      setSaving(false);
    }
  };

  const reviewCorrection = async (id: string, approve: boolean) => {
    setSaving(true);
    try {
      if (approve) await approveCorrectionRequest(id, 'Approved from admin control panel.');
      else await rejectCorrectionRequest(id, 'Rejected from admin control panel.');
      toast.success(`Correction ${approve ? 'approved' : 'rejected'}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not review correction.');
    } finally {
      setSaving(false);
    }
  };

  const reviewLeave = async (id: string, approve: boolean) => {
    setSaving(true);
    try {
      if (approve) await approveLeaveRequest(id, 'Approved from admin control panel.');
      else await rejectLeaveRequest(id, 'Rejected from admin control panel.');
      toast.success(`Leave ${approve ? 'approved' : 'rejected'}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not review leave.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading attendance controls..." />;
  if (error) return <ErrorState title="Attendance controls unavailable" message={error} onAction={load} />;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Version 1.2 Control Center</p>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Attendance Control</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Manage lock rules, working days, holidays, correction approvals, and leave approvals.</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-blue-600" /><h3 className="text-lg font-bold">Lock & Weekend Rules</h3></div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Freeze after hours</label>
          <input type="number" min={0} value={policy.lockAfterHours} onChange={(e) => setPolicy((current) => ({ ...current, lockAfterHours: Number(e.target.value) }))} className="field-input mt-2" />
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Working days</p>
            <div className="flex flex-wrap gap-2">
              {dayLabels.map((label, index) => {
                const active = policy.workingDays.includes(index);
                return <button key={label} type="button" onClick={() => setPolicy((current) => ({ ...current, workingDays: active ? current.workingDays.filter((day) => day !== index) : [...current.workingDays, index].sort() }))} className={`rounded-xl border px-3 py-2 text-sm font-bold ${active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600'}`}>{label}</button>;
              })}
            </div>
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={policy.adminOverrideEnabled} onChange={(e) => setPolicy((current) => ({ ...current, adminOverrideEnabled: e.target.checked }))} /> Admin override enabled
          </label>
          <button disabled={saving} onClick={savePolicy} className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50">Save Policy</button>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center gap-3"><CalendarDays className="text-blue-600" /><h3 className="text-lg font-bold">Holiday Calendar</h3></div>
          <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]">
            <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm((current) => ({ ...current, date: e.target.value }))} className="field-input" />
            <input value={holidayForm.name} onChange={(e) => setHolidayForm((current) => ({ ...current, name: e.target.value }))} placeholder="Holiday name" className="field-input" />
            <input value={holidayForm.description} onChange={(e) => setHolidayForm((current) => ({ ...current, description: e.target.value }))} placeholder="Description" className="field-input" />
            <button disabled={saving} onClick={addHoliday} className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white disabled:opacity-50">Add</button>
          </div>
          <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
            {holidays.length === 0 ? <EmptyState title="No holidays" message="Add holidays to block attendance marking on those dates." /> : holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="font-bold text-slate-900 dark:text-white">{holiday.name}</p><p className="text-sm text-slate-500">{new Date(holiday.date).toLocaleDateString()} • {holiday.academicYear}</p></div>
                <button aria-label="Delete holiday" onClick={async () => { await deleteHoliday(holiday.id); await load(); }} className="rounded-xl p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RequestPanel title="Pending Corrections" items={corrections} empty="No pending correction requests." onApprove={(id) => reviewCorrection(id, true)} onReject={(id) => reviewCorrection(id, false)} render={(item) => (
          <><p className="font-bold">{item.session?.subject?.name ?? 'Attendance session'} • {item.student?.name ?? 'Full session'}</p><p className="text-sm text-slate-500">{item.currentStatus ?? '-'} → {item.requestedStatus ?? '-'} • {item.reason}</p></>
        )} />
        <RequestPanel title="Pending Leaves" items={leaves} empty="No pending leave requests." onApprove={(id) => reviewLeave(id, true)} onReject={(id) => reviewLeave(id, false)} render={(item) => (
          <><p className="font-bold">{item.student?.name ?? 'Student'} • {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}</p><p className="text-sm text-slate-500">{item.reason}</p></>
        )} />
      </section>
    </div>
  );
};

function RequestPanel<T extends { id: string }>(props: { title: string; items: T[]; empty: string; onApprove: (id: string) => void; onReject: (id: string) => void; render: (item: T) => React.ReactNode }) {
  return <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="mb-4 flex items-center gap-3"><Clock className="text-blue-600" /><h3 className="text-lg font-bold">{props.title}</h3></div>{props.items.length === 0 ? <EmptyState title={props.empty} message="New requests will appear here." /> : <div className="space-y-3">{props.items.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800"><div>{props.render(item)}</div><div className="mt-3 flex gap-2"><button onClick={() => props.onApprove(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"><CheckCircle2 size={16} />Approve</button><button onClick={() => props.onReject(item.id)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white"><XCircle size={16} />Reject</button></div></div>)}</div>}</div>;
}
