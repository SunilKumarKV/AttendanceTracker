import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getStudentDashboard, getStudentReport, PortalDashboard } from '../api/portal';
import { Loader, ErrorState } from './common';
import { AttendanceTables, DownloadButton, downloadCsv, NotificationsList, ProfileCard, SummaryCards, WarningBanner } from './PortalShared';
import { MainLayout } from './MainLayout';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudentDashboard();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load student dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const download = async () => {
    try {
      const response = await getStudentReport();
      downloadCsv(`attendance-report-${response.data.profile.rollNumber}.csv`, response.data.rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Report download failed');
    }
  };

  return <MainLayout>{loading ? <Loader label="Loading student portal..." /> : error ? <ErrorState title="Student portal unavailable" message={error} actionLabel="Retry" onAction={load} /> : data ? <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Student Dashboard</h1><p className="text-sm font-medium text-slate-500">View your attendance, leave status, corrections, and report.</p></div><DownloadButton onClick={download} /></div><WarningBanner level={data.summary.lowAttendanceWarning} /><SummaryCards summary={data.summary} /><ProfileCard profile={data.profile} /><AttendanceTables dashboard={data} /><div className="grid gap-6 xl:grid-cols-2"><NotificationsList notifications={data.notifications} /><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="font-black">Leave & Correction Status</h3><div className="mt-4 space-y-3">{[...data.leaves.map((item) => ({ id: item.id, label: `Leave: ${item.reason}`, status: item.status })), ...data.corrections.map((item) => ({ id: item.id, label: `Correction: ${item.reason}`, status: item.status }))].map((item) => <div key={item.id} className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950"><p className="font-bold">{item.label}</p><p className="mt-1 text-slate-500">Status: {item.status}</p></div>)}</div></section></div></div> : null}</MainLayout>;
};
