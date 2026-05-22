import React, { useEffect, useState } from 'react';
import { getStudentProfile, PortalProfile } from '../api/portal';
import { Loader, ErrorState } from './common';
import { MainLayout } from './MainLayout';
import { ProfileCard } from './PortalShared';

export const StudentProfile: React.FC = () => {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); setError(''); try { setProfile((await getStudentProfile()).data); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load profile'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <MainLayout>{loading ? <Loader label="Loading profile..." /> : error ? <ErrorState title="Profile unavailable" message={error} actionLabel="Retry" onAction={load} /> : profile ? <div className="space-y-6"><h1 className="text-2xl font-black text-slate-900 dark:text-white">My Profile</h1><ProfileCard profile={profile} /></div> : null}</MainLayout>;
};
