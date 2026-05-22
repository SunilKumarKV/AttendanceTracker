import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { AttendanceSummary, PortalDashboard, PortalNotification, PortalProfile } from '../api/portal';

export const SummaryCards: React.FC<{ summary: AttendanceSummary }> = ({ summary }) => {
  const cards = [
    ['Present', summary.present],
    ['Absent', summary.absent],
    ['Late', summary.late],
    ['Approved Leave', summary.approvedLeave],
    ['Attendance %', `${summary.percentage}%`],
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p></div>)}</div>;
};

export const WarningBanner: React.FC<{ level: AttendanceSummary['lowAttendanceWarning'] }> = ({ level }) => {
  if (level === 'NONE') return null;
  const label = level === 'CRITICAL' ? 'Critical low attendance' : level === 'VERY_LOW' ? 'Very low attendance' : 'Low attendance warning';
  return <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle size={20} />{label}. Please contact your class teacher/admin.</div>;
};

export const ProfileCard: React.FC<{ profile: PortalProfile }> = ({ profile }) => <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="text-lg font-black text-slate-900 dark:text-white">Profile</h3><div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><b>Name:</b> {profile.name}</p><p><b>Roll No:</b> {profile.rollNumber}</p><p><b>Class:</b> {profile.course?.name ?? '-'}</p><p><b>Section:</b> {profile.section?.name ?? '-'}</p><p><b>Email:</b> {profile.email ?? '-'}</p><p><b>Phone:</b> {profile.phone ?? '-'}</p><p><b>Parent:</b> {profile.parentName ?? '-'}</p><p><b>Academic Year:</b> {profile.academicYear ?? '-'}</p></div></section>;

export const AttendanceTables: React.FC<{ dashboard: PortalDashboard }> = ({ dashboard }) => <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black">Subject-wise Attendance</h3><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Subject</th><th>Present</th><th>Leave</th><th>Total</th><th>%</th></tr></thead><tbody>{dashboard.subjects.map((subject) => <tr key={subject.subjectId} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 font-bold">{subject.subjectName}</td><td>{subject.present}</td><td>{subject.approvedLeave}</td><td>{subject.total}</td><td>{subject.percentage}%</td></tr>)}</tbody></table></div></section><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black">Monthly Attendance</h3><div className="mt-4 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Month</th><th>Present</th><th>Leave</th><th>Total</th><th>%</th></tr></thead><tbody>{dashboard.months.map((month) => <tr key={month.month} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 font-bold">{month.month}</td><td>{month.present}</td><td>{month.approvedLeave}</td><td>{month.total}</td><td>{month.percentage}%</td></tr>)}</tbody></table></div></section></div>;

export const NotificationsList: React.FC<{ notifications: PortalNotification[] }> = ({ notifications }) => <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black">Notifications</h3><div className="mt-4 space-y-3">{notifications.length === 0 ? <p className="text-sm text-slate-500">No notifications yet.</p> : notifications.map((notification) => <article key={notification.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="font-bold">{notification.subject ?? notification.type ?? 'Notification'}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p></article>)}</div></section>;

export const downloadCsv = (filename: string, rows: unknown[]) => {
  const normalized = rows.map((row) => row && typeof row === 'object' ? row as Record<string, unknown> : { value: row });
  const headers = Array.from(new Set(normalized.flatMap((row) => Object.keys(row))));
  const csv = [headers.join(','), ...normalized.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const DownloadButton: React.FC<{ onClick: () => void }> = ({ onClick }) => <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-black text-white hover:bg-blue-700"><Download size={18} />Download Report</button>;
