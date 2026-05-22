import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, CalendarCheck, Clock, GraduationCap, Lock } from 'lucide-react';
import { getAttendanceSessions, getTeacherClassStudents, getTeacherDashboard, TeacherDashboard as DashboardData } from '../api/teacher';
import { EmptyState, ErrorState, Loader } from './common';

export const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [lowAttendanceCount, setLowAttendanceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getTeacherDashboard();
      setData(response.data);
      const [sessionsResponse, studentGroups] = await Promise.all([
        getAttendanceSessions({ page: 1, pageSize: 100 }),
        Promise.all(response.data.assignments.map((assignment) => getTeacherClassStudents(assignment.classId, assignment.sectionId).then((students) => students.data))),
      ]);
      const studentMap = new Map<string, { total: number; attended: number }>();
      studentGroups.flat().forEach((student) => {
        if (student.id && !studentMap.has(student.id)) studentMap.set(student.id, { total: 0, attended: 0 });
      });
      sessionsResponse.data.items.forEach((session) => {
        session.records.forEach((record) => {
          const summary = studentMap.get(record.studentId);
          if (!summary) return;
          summary.total += 1;
          if (record.status !== 'ABSENT') summary.attended += 1;
        });
      });
      setLowAttendanceCount([...studentMap.values()].filter((item) => item.total > 0 && (item.attended / item.total) * 100 < 75).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teacher dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const todaySessions = useMemo(() => data?.recentSessions.filter((session) => session.sessionDate.slice(0, 10) === new Date().toISOString().slice(0, 10)) ?? [], [data]);

  if (loading) return <Loader label="Loading teacher dashboard..." />;
  if (error) return <ErrorState title="Dashboard unavailable" message={error} onAction={loadDashboard} />;
  if (!data) return <EmptyState title="No dashboard data" message="Assignments and attendance sessions will appear here." />;

  if (data.assignments.length === 0) {
    return (
      <EmptyState
        title="No academic assignments found"
        message="Ask administrator to assign your classes and subjects."
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Panel</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Dashboard</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Your assigned classes, attendance workload, and recent activity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/mark-attendance')} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Take Attendance</button>
          <button type="button" onClick={() => navigate('/my-students')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">View Students</button>
          <button type="button" onClick={() => navigate('/my-reports')} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">View Reports</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Stat icon={<GraduationCap />} label="Assigned Classes" value={data.classCount} />
        <Stat icon={<BookOpen />} label="Assigned Subjects" value={data.subjectCount} />
        <Stat icon={<CalendarCheck />} label="Today Sessions" value={data.todaySessionCount ?? todaySessions.length} />
        <Stat icon={<Clock />} label="Pending Attendance" value={data.pendingAttendanceCount ?? 0} tone="amber" />
        <Stat icon={<AlertTriangle />} label="Low Attendance" value={lowAttendanceCount} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 p-6 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Classes and Subjects</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{assignment.subjectName}</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {assignment.className}{assignment.sectionName ? ` - ${assignment.sectionName}` : ''}{assignment.semesterName ? ` - ${assignment.semesterName}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Active</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Attendance Sessions</h3>
            <button type="button" onClick={() => navigate('/attendance-history')} className="text-sm font-bold text-blue-600">View all</button>
          </div>
          {data.recentSessions.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No attendance yet" message="Start with Take Attendance to create your first session." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentSessions.map((session) => (
                <button key={session.id} type="button" onClick={() => navigate(`/mark-attendance?session=${session.id}`)} className="flex w-full flex-col gap-3 p-5 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-900">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{session.subjectName} - {session.className}</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{new Date(session.sessionDate).toLocaleDateString()} - {session.period} - {session.records.length} records</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ${session.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {session.isLocked && <Lock size={12} />}
                    {session.isLocked ? 'Locked' : 'Editable'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: number; tone?: 'blue' | 'amber' | 'red' }> = ({ icon, label, value, tone = 'blue' }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
};

export const ProfessorDashboard = TeacherDashboard;
