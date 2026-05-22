import React, { useEffect, useState } from 'react';
import { getStudentNotifications, PortalNotification } from '../api/portal';
import { Loader, ErrorState } from './common';
import { MainLayout } from './MainLayout';
import { NotificationsList } from './PortalShared';

export const StudentNotifications: React.FC = () => {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setError(''); try { setItems((await getStudentNotifications()).data); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load notifications'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <MainLayout>{loading ? <Loader label="Loading notifications..." /> : error ? <ErrorState title="Notifications unavailable" message={error} actionLabel="Retry" onAction={load} /> : <div className="space-y-6"><h1 className="text-2xl font-black text-slate-900 dark:text-white">Notifications</h1><NotificationsList notifications={items} /></div>}</MainLayout>;
};
