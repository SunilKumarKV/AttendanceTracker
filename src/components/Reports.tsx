import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar as CalendarIcon,
  Download,
  FileText,
  Filter,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  toast,
  Toaster,
} from 'sonner';
import {
  downloadReportCsv,
  downloadReportPdf,
  FilterOption,
  getLowAttendanceReport,
  getMonthlyReport,
  getReportFilterOptions,
  getReportOverview,
  ReportFilters,
  ReportOverview,
  ReportStudent,
} from '../api/reports';
import { EmptyState, ErrorState, Loader } from './common';

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const ReportCharts = lazy(() => import('./ReportCharts').then((module) => ({ default: module.ReportCharts })));

export const Reports: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({ fromDate: thirtyDaysAgo, toDate: today, threshold: 75 });
  const [classes, setClasses] = useState<FilterOption[]>([]);
  const [semesters, setSemesters] = useState<FilterOption[]>([]);
  const [subjects, setSubjects] = useState<FilterOption[]>([]);
  const [sections, setSections] = useState<FilterOption[]>([]);
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [lowAttendance, setLowAttendance] = useState<ReportStudent[]>([]);
  const [view, setView] = useState<'overview' | 'low'>('overview');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState('');

  const loadOptions = useCallback(async () => {
    const options = await getReportFilterOptions();
    setClasses(options.classes);
    setSemesters(options.semesters);
    setSubjects(options.subjects);
    setSections(options.sections);
  }, []);

  const loadReport = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const [overviewResponse, lowResponse] = await Promise.all([
        getReportOverview(nextFilters),
        getLowAttendanceReport(nextFilters),
      ]);
      setReport(overviewResponse.data);
      setLowAttendance(lowResponse.data.students);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void (async () => {
      try {
        await loadOptions();
        await loadReport();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load reports.');
        setLoading(false);
      }
    })();
  }, [loadOptions, loadReport]);

  const filteredSections = useMemo(
    () => sections.filter((section) => (
      (!filters.classId || section.courseId === filters.classId)
      && (!filters.semesterId || section.semesterId === filters.semesterId)
    )),
    [sections, filters.classId, filters.semesterId],
  );

  const filteredSemesters = useMemo(
    () => semesters.filter((semester) => !filters.classId || semester.courseId === filters.classId),
    [semesters, filters.classId],
  );

  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => (
      (!filters.classId || subject.courseId === filters.classId)
      && (!filters.semesterId || subject.semesterId === filters.semesterId)
    )),
    [subjects, filters.classId, filters.semesterId],
  );

  const visibleStudents = useMemo(() => (
    view === 'low' ? lowAttendance : report?.students ?? []
  ), [lowAttendance, report?.students, view]);

  const pieData = useMemo(() => report ? [
    { name: 'Present', value: report.summary.overallPresent },
    { name: 'Late', value: report.summary.overallLate },
    { name: 'Excused', value: report.summary.overallExcused },
    { name: 'Absent', value: report.summary.overallAbsent },
  ] : [], [report]);

  const handleFilterChange = useCallback((key: keyof ReportFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      ...(key === 'classId' ? { semesterId: undefined, sectionId: undefined, subjectId: undefined } : {}),
      ...(key === 'semesterId' ? { sectionId: undefined, subjectId: undefined } : {}),
    }));
  }, []);

  const applyFilters = () => {
    void loadReport(filters);
  };

  const generateMonthly = async () => {
    if (!filters.month) {
      toast.error('Select a month first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await getMonthlyReport(filters);
      setReport(response.data);
      setLowAttendance(response.data.students.filter((student) => student.attendancePercentage < (filters.threshold ?? 75)));
      toast.success('Monthly report generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate monthly report.');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (type: 'csv' | 'pdf') => {
    setDownloading(type);
    try {
      if (type === 'csv') await downloadReportCsv(filters);
      else await downloadReportPdf(filters);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !report) return <Loader label="Loading reports..." />;
  if (error && !report) return <ErrorState title="Reports unavailable" message={error} onAction={() => void loadReport()} />;

  return (
    <div className="max-w-7xl mx-auto pb-20 print:p-0">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Attendance Reports</h2>
          <p className="text-slate-500 font-medium">Database-backed attendance summaries, low attendance lists, and exports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => window.print()} disabled={!report} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <Printer size={18} />
            Print
          </button>
          <button onClick={() => void downloadFile('pdf')} disabled={!report || downloading !== null} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50">
            <FileText size={18} />
            {downloading === 'pdf' ? 'Exporting...' : 'PDF'}
          </button>
          <button onClick={() => void downloadFile('csv')} disabled={!report || downloading !== null} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 disabled:opacity-50">
            <Download size={18} />
            {downloading === 'csv' ? 'Exporting...' : 'CSV'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          <DateField label="From Date" value={filters.fromDate ?? ''} onChange={(value) => handleFilterChange('fromDate', value)} />
          <DateField label="To Date" value={filters.toDate ?? ''} onChange={(value) => handleFilterChange('toDate', value)} />
          <SelectField label="Class" value={filters.classId ?? ''} onChange={(value) => handleFilterChange('classId', value)} options={classes} allLabel="All Classes" />
          <SelectField label="Semester" value={filters.semesterId ?? ''} onChange={(value) => handleFilterChange('semesterId', value)} options={filteredSemesters} allLabel="All Semesters" />
          <SelectField label="Section" value={filters.sectionId ?? ''} onChange={(value) => handleFilterChange('sectionId', value)} options={filteredSections} allLabel="All Sections" />
          <SelectField label="Subject" value={filters.subjectId ?? ''} onChange={(value) => handleFilterChange('subjectId', value)} options={filteredSubjects} allLabel="All Subjects" />
          <div className="space-y-2">
            <label htmlFor="report-threshold" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Threshold</label>
            <input id="report-threshold" type="number" min={0} max={100} value={filters.threshold ?? 75} onChange={(event) => setFilters((current) => ({ ...current, threshold: Number(event.target.value) }))} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div className="space-y-2">
            <label htmlFor="report-month" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Monthly Report</label>
            <input id="report-month" type="month" value={filters.month ?? ''} onChange={(event) => handleFilterChange('month', event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div className="flex gap-3">
            <button onClick={applyFilters} disabled={loading} className="flex-1 bg-blue-600 text-white h-[50px] rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
              <Filter size={20} />
              Apply
            </button>
            <button onClick={() => void generateMonthly()} disabled={loading} className="flex-1 bg-slate-900 text-white h-[50px] rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">
              Month
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-6 print:hidden"><ErrorState title="Could not refresh reports" message={error} onAction={() => void loadReport()} /></div>}

      {report ? (
        <div className="space-y-8">
          <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-5">
            <h1 className="text-3xl font-black text-slate-900">AttendanceTracker Report</h1>
            <p className="text-slate-600 font-bold mt-1">Period: {filters.fromDate || 'Start'} to {filters.toDate || 'Today'} · Generated {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
            <Stat icon={<BarChart3 />} label="Total Students" value={report.summary.studentCount} />
            <Stat icon={report.summary.averageAttendance >= (filters.threshold ?? 75) ? <TrendingUp /> : <TrendingDown />} label="Avg Attendance" value={`${report.summary.averageAttendance}%`} />
            <Stat icon={<TrendingDown />} label="Below 75%" value={report.summary.lowAttendanceBands?.below75 ?? report.summary.lowAttendanceCount} tone="danger" />
            <Stat icon={<TrendingDown />} label="Below 65%" value={report.summary.lowAttendanceBands?.below65 ?? 0} tone="danger" />
            <Stat icon={<TrendingDown />} label="Critical <50%" value={report.summary.lowAttendanceBands?.criticalBelow50 ?? 0} tone="danger" />
            <Stat icon={<BookOpen />} label="Sessions" value={report.summary.sessions} />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Student Attendance Summary</h3>
                <p className="text-sm text-slate-500">{view === 'low' ? 'Students below the selected threshold.' : 'All active students matching the selected filters.'}</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setView('overview')} className={`px-4 py-2 rounded-lg font-bold text-sm ${view === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Overview</button>
                <button onClick={() => setView('low')} className={`px-4 py-2 rounded-lg font-bold text-sm ${view === 'low' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>Low Attendance</button>
              </div>
            </div>
            {visibleStudents.length === 0 ? (
              <div className="p-8"><EmptyState title="No report data" message="No attendance records match the selected filters." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-5">Student</th>
                      <th className="px-6 py-5">Class</th>
                      <th className="px-6 py-5">Subject</th>
                      <th className="px-6 py-5 text-center">Total</th>
                      <th className="px-6 py-5 text-center">Present</th>
                      <th className="px-6 py-5 text-center">Late</th>
                      <th className="px-6 py-5 text-center">Excused</th>
                      <th className="px-6 py-5 text-center">Absent</th>
                      <th className="px-6 py-5 text-center">Attendance</th>
                      <th className="px-6 py-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleStudents.map((student) => (
                      <tr key={student.studentId} className={student.status === 'Shortage' ? 'bg-red-50/30' : ''}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{student.studentName}</p>
                          <p className="font-mono text-xs text-slate-500">{student.rollNo}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{student.className}{student.sectionName ? ` · ${student.sectionName}` : ''}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{student.subjectName || 'All subjects'}</td>
                        <td className="px-6 py-4 text-center font-bold">{student.totalClasses}</td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{student.present}</td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600">{student.late}</td>
                        <td className="px-6 py-4 text-center font-bold text-amber-600">{student.excused}</td>
                        <td className="px-6 py-4 text-center font-bold text-red-500">{student.absent}</td>
                        <td className="px-6 py-4 text-center font-black text-slate-900">{student.attendancePercentage}%</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.status === 'Regular' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{student.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Suspense fallback={<Loader label="Loading charts..." />}>
            <ReportCharts pieData={pieData} visibleStudents={visibleStudents} />
          </Suspense>
        </div>
      ) : (
        <EmptyState title="No report generated" message="Apply filters to generate an attendance report." />
      )}
    </div>
  );
};

const DateField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label htmlFor={`report-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input id={`report-${label.toLowerCase().replace(/\s+/g, '-')}`} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700" />
    </div>
  </div>
);

const SelectField: React.FC<{ label: string; value: string; options: FilterOption[]; allLabel: string; onChange: (value: string) => void }> = ({ label, value, options, allLabel, onChange }) => (
  <div className="space-y-2">
    <label htmlFor={`report-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <select id={`report-${label.toLowerCase().replace(/\s+/g, '-')}`} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white">
      <option value="">{allLabel}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.code ? ` (${option.code})` : ''}</option>)}
    </select>
  </div>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; tone?: 'danger' }> = ({ icon, label, value, tone }) => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm print:shadow-none print:border-slate-300">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
      {icon}
    </div>
    <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-4xl font-black text-slate-900 mt-2">{value}</p>
  </div>
);
