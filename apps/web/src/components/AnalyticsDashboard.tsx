import React, { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BarChart3, Download, RefreshCcw, TrendingDown, Users } from 'lucide-react';
import { MainLayout } from './MainLayout';
import { ErrorState, Loader } from './common';
import { downloadAnalyticsExport, getAnalyticsCharts, getAnalyticsFilterOptions, getAnalyticsOverview, getRiskInsights, getTeacherInsights, AnalyticsCharts, AnalyticsFilterOptions, AnalyticsFilters, AnalyticsOverview, RiskInsights, TeacherInsights } from '../api/analytics';
import { useAuth } from '../context/AuthContext';

const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);
const toInputDate = (date: Date) => date.toISOString().slice(0, 10);

const kpiClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const titleClass = 'text-sm font-medium text-slate-500 dark:text-slate-400';
const valueClass = 'mt-2 text-2xl font-bold text-slate-900 dark:text-white';

const defaultFilters: AnalyticsFilters = { fromDate: toInputDate(thirtyDaysAgo), toDate: toInputDate(today), threshold: 75 };

const ChartCard: React.FC<{ title: string; children: React.ReactNode; empty?: boolean }> = ({ title, children, empty }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
    {empty ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">No analytics data for the selected filters.</p> : children}
  </section>
);

const KpiCard: React.FC<{ label: string; value: string | number; hint?: string; icon?: React.ElementType }> = ({ label, value, hint, icon: Icon = BarChart3 }) => (
  <div className={kpiClass}>
    <div className="flex items-center justify-between gap-3">
      <span className={titleClass}>{label}</span>
      <span className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><Icon size={18} /></span>
    </div>
    <div className={valueClass}>{value}</div>
    {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

export const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HOD'].includes(user?.role ?? '');
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [charts, setCharts] = useState<AnalyticsCharts | null>(null);
  const [risks, setRisks] = useState<RiskInsights | null>(null);
  const [teacherInsights, setTeacherInsights] = useState<TeacherInsights | null>(null);
  const [options, setOptions] = useState<AnalyticsFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, chartsRes, risksRes, teachersRes, optionsRes] = await Promise.all([
        getAnalyticsOverview(filters),
        getAnalyticsCharts(filters),
        getRiskInsights(filters),
        getTeacherInsights(filters),
        getAnalyticsFilterOptions(),
      ]);
      setOverview(overviewRes.data);
      setCharts(chartsRes.data);
      setRisks(risksRes.data);
      setTeacherInsights(teachersRes.data);
      setOptions(optionsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load analytics dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const riskRows = useMemo(() => risks?.belowThreshold.slice(0, 10) ?? [], [risks]);

  const updateFilter = (key: keyof AnalyticsFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const exportFile = async (format: 'csv' | 'xlsx' | 'pdf', type: 'summary' | 'risks' | 'classes' | 'subjects') => {
    setExporting(`${type}-${format}`);
    try {
      await downloadAnalyticsExport(format, type, filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <MainLayout><Loader label="Loading analytics..." /></MainLayout>;
  if (error && !overview) return <MainLayout><ErrorState title="Analytics unavailable" message={error} onAction={load} /></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-100">Version 1.9</p>
            <h1 className="text-2xl font-bold md:text-3xl">Analytics Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">Institution overview, trends, risk insights, teacher performance, filters, and exports powered by real attendance data.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"><RefreshCcw size={16} /> Refresh</button>
            <button onClick={() => exportFile('pdf', 'summary')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Download size={16} /> PDF Summary</button>
          </div>
        </header>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-6">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">From<input type="date" value={filters.fromDate ?? ''} onChange={(e) => updateFilter('fromDate', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">To<input type="date" value={filters.toDate ?? ''} onChange={(e) => updateFilter('toDate', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Class<select value={filters.classId ?? ''} onChange={(e) => updateFilter('classId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option>{options?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Section<select value={filters.sectionId ?? ''} onChange={(e) => updateFilter('sectionId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option>{options?.sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Subject<select value={filters.subjectId ?? ''} onChange={(e) => updateFilter('subjectId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option>{options?.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          {isAdmin && <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Teacher<select value={filters.teacherId ?? ''} onChange={(e) => updateFilter('teacherId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option>{options?.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
          {isAdmin && <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Student<select value={filters.studentId ?? ''} onChange={(e) => updateFilter('studentId', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option>{options?.students.map((st) => <option key={st.id} value={st.id}>{st.name} ({st.rollNumber})</option>)}</select></label>}
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Status<select value={filters.status ?? ''} onChange={(e) => updateFilter('status', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">All</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LATE">Late</option><option value="EXCUSED">Approved Leave</option></select></label>
          <div className="flex items-end"><button onClick={load} className="w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Apply filters</button></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Attendance %" value={`${overview?.kpis.attendancePercentage ?? 0}%`} hint="Present + late + approved leave" icon={BarChart3} />
          <KpiCard label="Low attendance" value={overview?.kpis.lowAttendanceStudents ?? 0} hint="Below selected threshold" icon={TrendingDown} />
          <KpiCard label="Critical risk" value={overview?.kpis.criticalRiskStudents ?? 0} hint="Below 50%" icon={AlertTriangle} />
          <KpiCard label="Records analysed" value={overview?.kpis.records ?? 0} hint={`${overview?.kpis.attendanceSessions ?? 0} sessions`} icon={Users} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ChartCard title="Daily Attendance Trend" empty={!charts?.daily.length}>
            <ResponsiveContainer width="100%" height={280}><AreaChart data={charts?.daily ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Area type="monotone" dataKey="percentage" name="Attendance %" /></AreaChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Class Comparison" empty={!charts?.classComparison.length}>
            <ResponsiveContainer width="100%" height={280}><BarChart data={charts?.classComparison ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="className" /><YAxis /><Tooltip /><Bar dataKey="percentage" name="Attendance %" /></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Subject Comparison" empty={!charts?.subjectComparison.length}>
            <ResponsiveContainer width="100%" height={280}><BarChart data={charts?.subjectComparison ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subjectName" /><YAxis /><Tooltip /><Bar dataKey="percentage" name="Attendance %" /></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Risk Distribution" empty={!charts?.lowAttendanceDistribution.length}>
            <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={charts?.lowAttendanceDistribution ?? []} dataKey="count" nameKey="risk" outerRadius={90} label>{charts?.lowAttendanceDistribution.map((_, index) => <Cell key={index} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-base font-semibold text-slate-900 dark:text-white">Student Risk Insights</h3><button onClick={() => exportFile('xlsx', 'risks')} disabled={!!exporting} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Export</button></div>
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Student</th><th>Class</th><th>%</th><th>Risk</th><th>Trend</th></tr></thead><tbody>{riskRows.map((r) => <tr key={r.studentId} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 font-medium text-slate-900 dark:text-white">{r.studentName}<div className="text-xs text-slate-500">{r.rollNumber}</div></td><td>{r.className} {r.sectionName}</td><td>{r.percentage}%</td><td className="capitalize">{r.riskCategory}</td><td>{r.droppingTrend ? 'Dropping' : 'Stable'}</td></tr>)}</tbody></table></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Teacher Insights</h3>
            <div className="space-y-3">{teacherInsights?.teachers.slice(0, 6).map((t) => <div key={t.teacherId} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900 dark:text-white">{t.teacherName}</p><p className="text-xs text-slate-500">{t.classesHandled} classes · {t.subjectsHandled} subjects</p></div><span className="text-sm font-bold text-blue-600">{t.attendanceSubmissionConsistency}%</span></div><p className="mt-2 text-xs text-slate-500">Pending attendance days: {t.pendingAttendanceDays}</p></div>)}</div>
          </div>
        </section>

        <section className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button onClick={() => exportFile('csv', 'summary')} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">CSV Summary</button>
          <button onClick={() => exportFile('xlsx', 'classes')} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Excel Class Analytics</button>
          <button onClick={() => exportFile('xlsx', 'subjects')} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">Excel Subject Analytics</button>
        </section>
      </div>
    </MainLayout>
  );
};
