import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getParentChildDashboard, getParentChildReport, getParentChildren, PortalDashboard, PortalProfile } from '../api/portal';
import { Loader, ErrorState } from './common';
import { AttendanceTables, DownloadButton, downloadCsv, NotificationsList, ProfileCard, SummaryCards, WarningBanner } from './PortalShared';
import { MainLayout } from './MainLayout';

export const ParentDashboard: React.FC = () => {
  const [children, setChildren] = useState<PortalProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState<PortalDashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const childResponse = await getParentChildren();
      const firstId = selectedId || childResponse.data[0]?.id || '';
      setChildren(childResponse.data);
      setSelectedId(firstId);
      setDashboard(firstId ? (await getParentChildDashboard(firstId)).data : null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load parent dashboard'); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const changeChild = async (studentId: string) => {
    setSelectedId(studentId);
    setDashboard((await getParentChildDashboard(studentId)).data);
  };

  const download = async () => {
    if (!selectedId) return;
    try { const response = await getParentChildReport(selectedId); downloadCsv(`child-attendance-report-${response.data.profile.rollNumber}.csv`, response.data.rows); } catch (err) { toast.error(err instanceof Error ? err.message : 'Report download failed'); }
  };

  return <MainLayout>{loading ? <Loader label="Loading parent portal..." /> : error ? <ErrorState title="Parent portal unavailable" message={error} actionLabel="Retry" onAction={load} /> : <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Parent Dashboard</h1><p className="text-sm font-medium text-slate-500">Securely view mapped child attendance and alerts.</p></div><div className="flex gap-3"><select value={selectedId} onChange={(event) => void changeChild(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold dark:border-slate-700 dark:bg-slate-900">{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select><DownloadButton onClick={download} /></div></div>{dashboard ? <><WarningBanner level={dashboard.summary.lowAttendanceWarning} /><SummaryCards summary={dashboard.summary} /><ProfileCard profile={dashboard.profile} /><AttendanceTables dashboard={dashboard} /><NotificationsList notifications={dashboard.notifications} /></> : <p className="rounded-2xl bg-white p-6 text-slate-500 dark:bg-slate-900">No children are mapped to this parent account.</p>}</div>}</MainLayout>;
};
