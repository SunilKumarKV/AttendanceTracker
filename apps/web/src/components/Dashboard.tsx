
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Send, 
  Clock, 
  ArrowUpRight, 
  Loader2,
  CheckCircle2,
  XCircle,
  GraduationCap,
  BookOpen,
  Layers,
  Link2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { toast, Toaster } from 'sonner';
import { getAdminDashboard, DashboardData } from '../api/admin';
import { getAcademicDashboardSummary, AcademicDashboardSummary } from '../api/academicOps';
import { behaviourApi } from '../api/behaviour';
import { EmptyState, ErrorState } from './common';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingAlert, setSendingAlert] = useState<string | null>(null);
  const [academicSummary, setAcademicSummary] = useState<AcademicDashboardSummary | null>(null);
  const [behaviourSummary, setBehaviourSummary] = useState<{ recent: unknown[]; highSeverityDisciplineCount: number; appreciationCount: number; pendingParentNotificationCount: number } | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [result, academic, behaviour] = await Promise.all([getAdminDashboard(), getAcademicDashboardSummary().catch(() => null), behaviourApi.dashboard().catch(() => null)]);
      setData(result.data);
      if (academic) setAcademicSummary(academic.data);
      if (behaviour) setBehaviourSummary(behaviour.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSendAlert = async (student: DashboardData['atRiskStudents'][0]) => {
    setSendingAlert(student.rollNo);
    try {
      toast.info('Notifications are not connected in this phase.');
    } catch (err) {
      console.error('Error sending alert:', err);
      toast.error('Failed to send alert.');
    } finally {
      setSendingAlert(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-3xl border border-slate-200" />
          ))}
        </div>
        <div className="h-80 bg-slate-50 rounded-3xl border border-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-50 rounded-3xl border border-slate-200" />
          <div className="h-64 bg-slate-50 rounded-3xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState title="Dashboard unavailable" message={error} onAction={fetchDashboardData} />;
  if (!data) return <EmptyState title="No dashboard data" message="Add students and attendance sessions to populate the dashboard." />;

  return (
    <div className="space-y-8 pb-12">
      <Toaster position="top-right" />
      <SetupChecklist data={data} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Upcoming Exams</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{academicSummary?.upcomingExams ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Today Timetable</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{academicSummary?.todayTimetable ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Latest Notices</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{academicSummary?.latestNotices ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Shared Resources</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{academicSummary?.sharedResourcesCount ?? 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Recent Behaviour</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{behaviourSummary?.recent?.length ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">High Severity Discipline</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{behaviourSummary?.highSeverityDisciplineCount ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Appreciations</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{behaviourSummary?.appreciationCount ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Parent Notify Pending</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{behaviourSummary?.pendingParentNotificationCount ?? 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending Corrections</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{data.pendingCorrections ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending Leave Requests</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{data.pendingLeaveRequests ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Today Status</p>
          <p className="mt-2 text-lg font-black text-slate-900">{data.todayStatus?.holiday ? `Holiday: ${data.todayStatus.holiday.name}` : data.todayStatus?.workingDay ? 'Working Day' : 'Non-working Day'}</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending Staff Leaves</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{data.staffSummary?.pendingStaffLeaves ?? 0}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Absent staff today: {data.staffSummary?.absentStaffToday ?? 0}</p>
        </div>
      </div>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Users size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Users size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Total Students</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold">{data.totalStudents}</h3>
            <div className="flex items-center text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
              <ArrowUpRight size={14} />
              <span>Active</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <UserCheck size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <UserCheck size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Present Today</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold">{data.presentToday}</h3>
            <div className="flex items-center text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
              <span>{data.totalStudents > 0 ? Math.round((data.presentToday / data.totalStudents) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-red-600 rounded-3xl p-6 text-white shadow-xl shadow-red-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <UserX size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <UserX size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Absent Today</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold">{data.absentToday}</h3>
            <div className="flex items-center text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
              <span>{data.totalStudents > 0 ? Math.round((data.absentToday / data.totalStudents) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-600/20 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <AlertTriangle size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <AlertTriangle size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Below 75%</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-4xl font-bold">{data.below75Count}</h3>
            <div className="flex items-center text-xs font-bold bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
              <span>Attention Required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Chart */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Attendance Overview</h3>
            <p className="text-slate-500 font-medium">Monthly attendance percentage per student</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span>Safe (≥75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>At Risk (&lt;75%)</span>
            </div>
          </div>
        </div>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                formatter={(value: number) => [`${value}%`, 'Attendance']}
              />
              <Bar dataKey="percentage" radius={[8, 8, 0, 0]} barSize={40}>
                {data.chartData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.percentage < 75 ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* At-Risk Students */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-900">At-Risk Students</h3>
            <p className="text-slate-500 font-medium">Students with attendance below 75% threshold</p>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Attendance</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.atRiskStudents?.map((student) => (
                  <tr key={student.rollNo} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                    <td className="px-6 py-4">
                      <span className="text-red-600 font-bold">{student.attendancePercentage}%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleSendAlert(student)}
                        disabled={sendingAlert === student.rollNo}
                        className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        {sendingAlert === student.rollNo ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Send size={16} />
                        )}
                        Send Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
            <p className="text-slate-500 font-medium">Last 5 attendance submissions</p>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {data.recentActivity?.map((activity, i) => (
              <div key={i} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                  <Clock size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900 truncate">{activity.subject}</h4>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activity.date}</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-2">By {activity.professor}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">
                      {activity.present} Present
                    </span>
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-lg">
                      {activity.absent} Absent
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SetupChecklist: React.FC<{ data: DashboardData }> = ({ data }) => {
  const checklist = data.setupChecklist;
  if (!checklist) return null;
  const items = [
    { label: 'Institution profile', count: checklist.institutionProfileCompleted ? 1 : 0, done: checklist.institutionProfileCompleted, action: '/settings', actionLabel: 'Complete Profile', icon: GraduationCap },
    { label: 'Classes', count: checklist.classes, done: checklist.classes > 0, action: '/academics', actionLabel: 'Add Class', icon: GraduationCap },
    { label: 'Semesters', count: checklist.semesters, done: checklist.semesters > 0, action: '/academics', actionLabel: 'Add Semester', icon: Layers },
    { label: 'Sections', count: checklist.sections, done: checklist.sections > 0, action: '/academics', actionLabel: 'Add Section', icon: Layers },
    { label: 'Subjects', count: checklist.subjects, done: checklist.subjects > 0, action: '/academics', actionLabel: 'Add Subject', icon: BookOpen },
    { label: 'Teachers', count: checklist.professors, done: checklist.professors > 0, action: '/manage-professors', actionLabel: 'Add Teacher', icon: UserCheck },
    { label: 'Students', count: checklist.students, done: checklist.students > 0, action: '/students', actionLabel: 'Add Student', icon: Users },
    { label: 'Assignments', count: checklist.assignments, done: checklist.assignments > 0, action: '/academics', actionLabel: 'Assign Teacher', icon: Link2 },
  ];
  const completeCount = items.filter((item) => item.done).length;
  return (
    <div className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Admin Setup Checklist</h3>
          <p className="text-sm font-semibold text-slate-500">Complete these items before teachers can take attendance.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">{completeCount} / {items.length} Complete</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <a key={item.label} href={item.action} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <item.icon size={18} className="text-blue-600" />
                <span className="font-bold text-slate-900">{item.label}</span>
              </div>
              {item.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
            </div>
            <p className="text-sm font-semibold text-slate-600">{item.done ? `${item.count} created` : 'Pending'}</p>
            {!item.done && <p className="mt-2 text-sm font-black text-blue-600">{item.actionLabel}</p>}
          </a>
        ))}
      </div>
    </div>
  );
};
