import React, { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Plus, RefreshCcw, Save, Trash2, UserCog } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { approveStaffLeave, createStaffMember, deleteStaffMember, downloadStaffReport, getStaffAttendance, getStaffLeaves, getStaffMembers, getStaffSummary, markStaffAttendance, rejectStaffLeave, StaffAttendanceRecord, StaffLeaveRequest, StaffMember, StaffSummary } from '../api/staff';
import { ErrorState } from './common';

const roleOptions = ['Office Staff', 'Lab In-charge', 'Accountant', 'Librarian', 'Non-teaching Staff'];
const today = () => new Date().toISOString().slice(0, 10);

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', employeeCode: '', staffRole: 'Office Staff', department: '', designation: '', phone: '', password: '' });
  const [attendanceForm, setAttendanceForm] = useState({ staffId: '', attendanceDate: today(), status: 'PRESENT', remarks: '' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [staffRes, attendanceRes, leaveRes, summaryRes] = await Promise.all([getStaffMembers('', 1, 100), getStaffAttendance(), getStaffLeaves(), getStaffSummary()]);
      setStaff(staffRes.data.items); setAttendance(attendanceRes.data); setLeaves(leaveRes.data); setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load staff module.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addStaff = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await createStaffMember({ ...form, password: form.password || undefined });
      toast.success('Staff member added.');
      setForm({ name: '', email: '', employeeCode: '', staffRole: 'Office Staff', department: '', designation: '', phone: '', password: '' });
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not add staff.'); }
    finally { setSaving(false); }
  };

  const submitAttendance = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await markStaffAttendance(attendanceForm); toast.success('Staff attendance saved.'); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save attendance.'); }
    finally { setSaving(false); }
  };

  const removeStaff = async (id: string) => {
    if (!confirm('Deactivate this staff member?')) return;
    await deleteStaffMember(id); toast.success('Staff member deactivated.'); await load();
  };

  const reviewLeave = async (id: string, approve: boolean) => {
    try { approve ? await approveStaffLeave(id) : await rejectStaffLeave(id); toast.success(approve ? 'Leave approved.' : 'Leave rejected.'); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not review leave.'); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return <div className="space-y-8 pb-12"><Toaster position="top-right" />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-blue-600">Version 1.5</p><h1 className="text-3xl font-black text-slate-900 dark:text-white">Staff Management</h1><p className="mt-2 text-slate-500">Manage staff, staff attendance, leaves, and staff reports.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white"><RefreshCcw size={18}/>Refresh</button></div>
    {error && <ErrorState title="Staff module unavailable" message={error} onAction={() => void load()} />}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4"><Summary title="Total staff" value={summary?.totalStaff ?? 0}/><Summary title="Marked today" value={summary?.todayAttendance ?? 0}/><Summary title="Absent today" value={summary?.absentToday ?? 0}/><Summary title="Pending leaves" value={summary?.pendingLeaves ?? 0}/></div>

    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]"><form onSubmit={addStaff} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 flex items-center gap-2 text-xl font-black"><UserCog size={22}/>Add staff</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[
      ['name','Name'],['email','Email'],['employeeCode','Employee code'],['department','Department'],['designation','Designation'],['phone','Phone'],['password','Initial password']
    ].map(([key,label]) => <label key={key} className="text-sm font-bold text-slate-600">{label}<input type={key==='email'?'email':'text'} required={['name','email','employeeCode'].includes(key)} value={(form as any)[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /></label>)}<label className="text-sm font-bold text-slate-600">Staff role<select value={form.staffRole} onChange={(e)=>setForm({...form, staffRole:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">{roleOptions.map(role=><option key={role}>{role}</option>)}</select></label></div><button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:bg-blue-300"><Plus size={18}/>Add staff</button></form>

    <form onSubmit={submitAttendance} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 text-xl font-black">Mark staff attendance</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-600">Staff<select required value={attendanceForm.staffId} onChange={(e)=>setAttendanceForm({...attendanceForm, staffId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="">Select staff</option>{staff.map(item=><option key={item.id} value={item.id}>{item.user.name} ({item.employeeCode})</option>)}</select></label><label className="text-sm font-bold text-slate-600">Date<input type="date" value={attendanceForm.attendanceDate} onChange={(e)=>setAttendanceForm({...attendanceForm, attendanceDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-sm font-bold text-slate-600">Status<select value={attendanceForm.status} onChange={(e)=>setAttendanceForm({...attendanceForm, status:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">{['PRESENT','ABSENT','LATE','LEAVE'].map(status=><option key={status}>{status}</option>)}</select></label><label className="text-sm font-bold text-slate-600">Remarks<input value={attendanceForm.remarks} onChange={(e)=>setAttendanceForm({...attendanceForm, remarks:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" /></label></div><button disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:bg-emerald-300"><Save size={18}/>Save attendance</button></form></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Staff list</h2><div className="flex gap-2">{(['csv','xlsx','pdf'] as const).map(format=><button key={format} onClick={()=>void downloadStaffReport(format)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><Download size={16}/>{format.toUpperCase()}</button>)}</div></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500">{['Name','Role','Department','Phone','Status','Action'].map(h=><th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{staff.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="p-3 font-bold">{item.user.name}<br/><span className="font-normal text-slate-500">{item.user.email}</span></td><td className="p-3">{item.staffRole}</td><td className="p-3">{item.department || '-'}</td><td className="p-3">{item.phone || '-'}</td><td className="p-3">{item.isActive ? 'Active':'Inactive'}</td><td className="p-3"><button onClick={()=>void removeStaff(item.id)} className="text-red-600"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></section>

    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 text-xl font-black">Recent staff attendance</h2><div className="space-y-3">{attendance.slice(0,10).map(record=><div key={record.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><b>{record.staff?.user.name}</b> — {record.status}<p className="text-sm text-slate-500">{new Date(record.attendanceDate).toLocaleDateString()} {record.remarks || ''}</p></div>)}</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-4 text-xl font-black">Pending staff leaves</h2><div className="space-y-3">{leaves.filter(l=>l.status==='PENDING').map(leave=><div key={leave.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><b>{leave.staff?.user.name}</b><p className="text-sm text-slate-500">{new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()} · {leave.reason}</p><div className="mt-3 flex gap-2"><button onClick={()=>void reviewLeave(leave.id,true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={()=>void reviewLeave(leave.id,false)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">Reject</button></div></div>)}</div></div></section>
  </div>;
};

const Summary: React.FC<{ title: string; value: number }> = ({ title, value }) => <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</p></div>;
