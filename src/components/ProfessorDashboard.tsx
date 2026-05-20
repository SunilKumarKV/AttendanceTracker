import React, { useEffect, useState } from 'react';
import { BookOpen, CalendarCheck, GraduationCap } from 'lucide-react';
import { getProfessorDashboard, ProfessorDashboard as DashboardData } from '../api/professor';
import { EmptyState, ErrorState, Loader } from './common';

export const ProfessorDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProfessorDashboard();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load professor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) return <Loader label="Loading dashboard..." />;
  if (error) return <ErrorState title="Dashboard unavailable" message={error} onAction={loadDashboard} />;
  if (!data) return <EmptyState title="No dashboard data" message="Assignments and attendance sessions will appear here." />;

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Stat icon={<GraduationCap />} label="Assigned Classes" value={data.classCount} />
        <Stat icon={<BookOpen />} label="Assigned Subjects" value={data.subjectCount} />
        <Stat icon={<CalendarCheck />} label="Recent Sessions" value={data.recentSessions.length} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Assigned Subjects</h3>
        </div>
        {data.assignments.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No assignments" message="An admin must assign classes and subjects before attendance can be marked." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.assignments.map((assignment) => (
              <div key={assignment.id} className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{assignment.subjectName}</p>
                  <p className="text-sm text-slate-500">{assignment.className}{assignment.sectionName ? ` - Section ${assignment.sectionName}` : ''}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {assignment.semesterName ?? 'Active'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Recent Attendance</h3>
        </div>
        {data.recentSessions.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No attendance yet" message="Saved attendance sessions will appear here." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recentSessions.map((session) => (
              <div key={session.id} className="p-5">
                <p className="font-bold text-slate-900">{session.subjectName} - {session.className}</p>
                <p className="text-sm text-slate-500">{new Date(session.sessionDate).toLocaleDateString()} · {session.records.length} records · {session.isLocked ? 'Locked' : 'Editable'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-4xl font-black text-slate-900 mt-2">{value}</p>
  </div>
);
