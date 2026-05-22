import React, { useEffect, useMemo, useState } from 'react';
import { Award, Download, FileText, ShieldAlert, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { behaviourApi, behaviourExportUrl, type BehaviourRecord, type BehaviourRecordPayload, type BehaviourRecordType } from '../api/behaviour';
import { MainLayout } from './MainLayout';
import { EmptyState, ErrorState, Loader } from './common';
import { getAuthToken } from '../auth/authStorage';
import { useAuth } from '../context/AuthContext';

type StudentOption = { id: string; name: string; rollNumber?: string; rollNo?: string; courseId?: string; sectionId?: string };

const today = () => new Date().toISOString().slice(0, 10);

export const BehaviourRecords: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HOD';
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'PROFESSOR';
  const canCreate = isAdmin || isTeacher;
  const [records, setRecords] = useState<BehaviourRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BehaviourRecordType | ''>('');
  const [form, setForm] = useState<BehaviourRecordPayload>({
    studentId: '',
    recordType: 'BEHAVIOUR',
    tone: 'NEUTRAL',
    title: '',
    description: '',
    eventDate: today(),
    severity: '',
  });

  const query = useMemo(() => filter ? `?recordType=${filter}` : '', [filter]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordResponse, studentResponse] = await Promise.all([
        behaviourApi.list(query),
        canCreate ? behaviourApi.studentOptions().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setRecords(recordResponse.data);
      const rawStudents = Array.isArray((studentResponse as any).data) ? (studentResponse as any).data : [];
      setStudents(rawStudents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load behaviour records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await behaviourApi.create({
        ...form,
        tone: form.recordType === 'DISCIPLINE' ? 'NEGATIVE' : form.recordType === 'APPRECIATION' ? 'POSITIVE' : form.tone,
        severity: form.recordType === 'DISCIPLINE' ? form.severity : '',
      });
      toast.success('Behaviour record saved');
      setForm({ studentId: '', recordType: 'BEHAVIOUR', tone: 'NEUTRAL', title: '', description: '', eventDate: today(), severity: '' });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save record');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string, approved: boolean) => {
    try {
      await behaviourApi.approve(id, approved);
      toast.success(approved ? 'Record approved' : 'Record hidden from portals');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update approval');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this behaviour record?')) return;
    try {
      await behaviourApi.remove(id);
      toast.success('Record deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete record');
    }
  };

  const download = async (format: 'csv' | 'excel' | 'pdf') => {
    const token = getAuthToken();
    const response = await fetch(behaviourExportUrl(format), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) { toast.error('Export failed'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `behaviour-report.${format === 'pdf' ? 'pdf' : 'csv'}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => ({
    total: records.length,
    high: records.filter((record) => record.severity === 'HIGH').length,
    appreciation: records.filter((record) => record.recordType === 'APPRECIATION').length,
    pendingNotify: records.filter((record) => record.parentNotificationRequired && !record.parentNotifiedAt).length,
  }), [records]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Version 1.7</p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Behaviour & Discipline</h1>
            <p className="text-slate-500 dark:text-slate-400">Track behaviour notes, discipline actions, appreciation records and secure portal visibility.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => download('csv')} className="rounded-xl border px-4 py-2 text-sm font-semibold"><Download className="mr-2 inline h-4 w-4" />CSV</button>
            <button onClick={() => download('excel')} className="rounded-xl border px-4 py-2 text-sm font-semibold"><Download className="mr-2 inline h-4 w-4" />Excel CSV</button>
            <button onClick={() => download('pdf')} className="rounded-xl border px-4 py-2 text-sm font-semibold"><FileText className="mr-2 inline h-4 w-4" />PDF</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500">Total Records</p><strong className="text-2xl">{summary.total}</strong></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500">High Severity</p><strong className="text-2xl">{summary.high}</strong></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500">Appreciations</p><strong className="text-2xl">{summary.appreciation}</strong></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"><p className="text-sm text-slate-500">Pending Parent Notify</p><strong className="text-2xl">{summary.pendingNotify}</strong></div>
        </div>

        {canCreate && (
          <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Add record</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <select required value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-950">
                <option value="">Select student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.name} - {student.rollNumber ?? student.rollNo ?? ''}</option>)}
              </select>
              <select value={form.recordType} onChange={(e) => setForm({ ...form, recordType: e.target.value as BehaviourRecordType })} className="rounded-xl border p-3 dark:bg-slate-950">
                <option value="BEHAVIOUR">Behaviour Note</option>
                <option value="DISCIPLINE">Discipline</option>
                <option value="APPRECIATION">Appreciation</option>
              </select>
              <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-950" />
              <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-950" />
              <input placeholder="Category / Award" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border p-3 dark:bg-slate-950" />
              {form.recordType === 'DISCIPLINE' && <select value={form.severity ?? ''} onChange={(e) => setForm({ ...form, severity: e.target.value as any })} className="rounded-xl border p-3 dark:bg-slate-950"><option value="">Severity</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select>}
              <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-3 rounded-xl border p-3 dark:bg-slate-950" />
              <input placeholder="Action taken / achievement" value={form.actionTaken ?? ''} onChange={(e) => setForm({ ...form, actionTaken: e.target.value, achievement: e.target.value })} className="md:col-span-2 rounded-xl border p-3 dark:bg-slate-950" />
              <label className="flex items-center gap-2 rounded-xl border p-3"><input type="checkbox" checked={Boolean(form.parentNotificationRequired)} onChange={(e) => setForm({ ...form, parentNotificationRequired: e.target.checked })} /> Parent notification required</label>
            </div>
            <button disabled={saving} className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save record'}</button>
          </form>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Records</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-xl border p-3 dark:bg-slate-950">
              <option value="">All records</option>
              <option value="BEHAVIOUR">Behaviour</option>
              <option value="DISCIPLINE">Discipline</option>
              <option value="APPRECIATION">Appreciation</option>
            </select>
          </div>
          {loading ? <Loader label="Loading behaviour records..." /> : error ? <ErrorState title="Unable to load records" message={error} /> : records.length === 0 ? <EmptyState title="No behaviour records" message="Records will appear here after they are added." /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead><tr className="border-b text-slate-500"><th className="py-3">Student</th><th>Type</th><th>Title</th><th>Severity</th><th>Visibility</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b align-top dark:border-slate-800">
                      <td className="py-3"><div className="font-semibold">{record.studentName}</div><div className="text-xs text-slate-500">{record.rollNumber} · {record.className} {record.sectionName}</div></td>
                      <td><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800">{record.recordType === 'APPRECIATION' ? <Star size={14}/> : record.recordType === 'DISCIPLINE' ? <ShieldAlert size={14}/> : <Award size={14}/>} {record.recordType}</span></td>
                      <td><div className="font-semibold">{record.title}</div><div className="max-w-md text-xs text-slate-500">{record.description}</div></td>
                      <td>{record.severity ?? '-'}</td>
                      <td>{record.isAdminOnly ? 'Admin only' : record.isApproved ? 'Portal visible' : 'Pending approval'}</td>
                      <td>{new Date(record.eventDate).toLocaleDateString()}</td>
                      <td className="space-x-2 whitespace-nowrap">
                        {isAdmin && <button onClick={() => approve(record.id, !record.isApproved)} className="rounded-lg border px-3 py-1 text-xs">{record.isApproved ? 'Hide' : 'Approve'}</button>}
                        {canCreate && <button onClick={() => remove(record.id)} className="rounded-lg border px-3 py-1 text-xs text-red-600"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
