import React, { useEffect, useState } from 'react';
import { CalendarDays, BookOpen, Bell, Clock } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { EmptyState, ErrorState, Loader } from './common';
import { getPortalAcademicFeed, PortalAcademicFeed } from '../api/academicOps';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const AcademicPortal: React.FC = () => {
  const [data, setData] = useState<PortalAcademicFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const result = await getPortalAcademicFeed(); setData(result.data); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load academic feed.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  if (loading) return <MainLayout><Loader label="Loading academic feed..." /></MainLayout>;
  if (error) return <MainLayout><ErrorState title="Academic feed unavailable" message={error} onAction={load} /></MainLayout>;
  if (!data) return <MainLayout><EmptyState title="No academic feed" message="No timetable, exams, notices, or resources are available yet." /></MainLayout>;
  return <MainLayout><div className="space-y-6"><h1 className="text-2xl font-black text-slate-900">Academic Feed</h1><Section title="Upcoming Exams" icon={CalendarDays}>{data.exams.map((item) => <Card key={item.id} title={`${item.examTitle} - ${item.subject?.name ?? ''}`} meta={`${new Date(item.examDate).toLocaleDateString()} ${item.startTime}-${item.endTime} • ${item.room ?? 'Room TBA'}`} />)}</Section><Section title="Class Timetable" icon={Clock}>{data.timetable.map((item) => <Card key={item.id} title={`${days[item.dayOfWeek]} Period ${item.period} - ${item.subject?.name ?? ''}`} meta={`${item.startTime}-${item.endTime} • ${item.teacher?.name ?? ''}`} />)}</Section><Section title="Notices" icon={Bell}>{data.notices.map((item) => <Card key={item.id} title={item.title} meta={item.message} />)}</Section><Section title="Resources" icon={BookOpen}>{data.resources.map((item) => <a key={item.id} className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200" href={item.resourceUrl} target="_blank" rel="noreferrer"><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.subject?.name ?? ''} • {item.resourceType}</p></a>)}</Section></div></MainLayout>;
};
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) { const array = React.Children.toArray(children); return <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><Icon size={20} className="text-blue-600" />{title}</h2>{array.length ? <div className="grid gap-3 md:grid-cols-2">{children}</div> : <EmptyState title={`No ${title.toLowerCase()}`} message="Nothing is available here yet." />}</section>; }
function Card({ title, meta }: { title: string; meta: string }) { return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="font-bold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{meta}</p></div>; }
