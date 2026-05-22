import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileText, Search } from 'lucide-react';
import { getAttendanceSessions, getTeacherAssignments, getTeacherClassStudents, TeacherAssignment } from '../api/teacher';
import { EmptyState, ErrorState, Loader } from './common';

interface ReportRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  className: string;
  sectionId: string | null;
  sectionName: string;
  subjectIds: Set<string>;
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  percentage: number;
}

export const TeacherReports: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [filters, setFilters] = useState({ classId: '', sectionId: '', subjectId: '', fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, sessionResponse] = await Promise.all([
        getTeacherAssignments(),
        getAttendanceSessions({ page: 1, pageSize: 100, ...filters }),
      ]);
      setAssignments(assignmentResponse.data);
      const groups = await Promise.all(assignmentResponse.data.map(async (assignment) => ({
        assignment,
        students: (await getTeacherClassStudents(assignment.classId, assignment.sectionId)).data,
      })));
      const map = new Map<string, ReportRow>();
      groups.forEach(({ assignment, students }) => {
        students.forEach((student) => {
          if (!student.id || map.has(student.id)) return;
          map.set(student.id, {
            studentId: student.id,
            studentName: student.name,
            rollNo: student.rollNo,
            classId: assignment.classId,
            className: assignment.className,
            sectionId: assignment.sectionId,
            sectionName: assignment.sectionName ?? 'All sections',
            subjectIds: new Set(),
            total: 0,
            present: 0,
            late: 0,
            excused: 0,
            absent: 0,
            percentage: 0,
          });
        });
      });
      sessionResponse.data.items.forEach((session) => {
        session.records.forEach((record) => {
          const row = map.get(record.studentId);
          if (!row) return;
          row.subjectIds.add(session.subjectId);
          row.total += 1;
          if (record.status === 'PRESENT') row.present += 1;
          if (record.status === 'LATE') row.late += 1;
          if (record.status === 'EXCUSED') row.excused += 1;
          if (record.status === 'ABSENT') row.absent += 1;
        });
      });
      map.forEach((row) => {
        row.percentage = row.total === 0 ? 0 : Number(((row.present / row.total) * 100).toFixed(1));
      });
      setRows([...map.values()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teacher reports.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredRows = useMemo(() => rows.filter((row) => (
    (!filters.classId || row.classId === filters.classId)
    && (!filters.sectionId || row.sectionId === filters.sectionId)
    && (!filters.subjectId || row.subjectIds.has(filters.subjectId))
  )), [filters.classId, filters.sectionId, filters.subjectId, rows]);

  const summary = useMemo(() => {
    const total = filteredRows.reduce((sum, row) => sum + row.total, 0);
    const present = filteredRows.reduce((sum, row) => sum + row.present, 0);
    const late = filteredRows.reduce((sum, row) => sum + row.late, 0);
    const excused = filteredRows.reduce((sum, row) => sum + row.excused, 0);
    const absent = filteredRows.reduce((sum, row) => sum + row.absent, 0);
    const percentage = total === 0 ? 0 : Number(((present / total) * 100).toFixed(1));
    return { total, present, late, excused, absent, percentage, low: filteredRows.filter((row) => row.total > 0 && row.percentage < 75).length };
  }, [filteredRows]);

  const classOptions = unique(assignments, 'classId');
  const sectionOptions = unique(assignments.filter((assignment) => !filters.classId || assignment.classId === filters.classId), 'sectionId');
  const subjectOptions = unique(assignments.filter((assignment) => !filters.classId || assignment.classId === filters.classId), 'subjectId');

  const exportCsv = async () => {
    const { default: Papa } = await import('papaparse');
    const csv = Papa.unparse(filteredRows.map((row) => ({
      RollNo: row.rollNo,
      Student: row.studentName,
      Class: row.className,
      Section: row.sectionName,
      Total: row.total,
      Present: row.present,
      Late: row.late,
      Excused: row.excused,
      Absent: row.absent,
      AttendancePercentage: row.percentage,
      Status: row.total > 0 && row.percentage < 75 ? 'Low Attendance' : 'Regular',
    })));
    downloadBlob(csv, 'text/csv;charset=utf-8;', `my_reports_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportPdf = () => {
    const lines = [
      `Average Attendance: ${summary.percentage}%`,
      `Total Records: ${summary.total}`,
      `Present Marks: ${summary.present}`,
      `Late Marks: ${summary.late}`,
      `Excused Marks: ${summary.excused}`,
      `Absent Marks: ${summary.absent}`,
      `Low Attendance Students: ${summary.low}`,
      '',
      ...filteredRows.slice(0, 34).map((row) => `${row.rollNo} - ${row.studentName}: ${row.total === 0 ? 'No records' : `${row.percentage}%`} (${row.total > 0 && row.percentage < 75 ? 'Low' : 'Regular'})`),
    ];
    downloadBlob(toSimplePdf('AttendanceTracker Teacher Report', lines), 'application/pdf', `my_reports_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return <Loader label="Loading teacher reports..." />;
  if (error) return <ErrorState title="Reports unavailable" message={error} onAction={loadReports} />;
  if (assignments.length === 0) return <EmptyState title="No academic assignments found" message="Ask administrator to assign your classes and subjects before reports are available." />;

  return (
    <div className="mx-auto max-w-7xl pb-12 print:bg-white">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10"><BarChart3 size={24} /></div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Panel</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">My Reports</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Class, subject, low-attendance, and trend summaries for your assigned students.</p>
          </div>
        </div>
        <div className="flex gap-3 print:hidden">
          <button type="button" onClick={() => void exportCsv()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"><Download size={18} /> CSV</button>
          <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"><FileText size={18} /> PDF/Print</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-6 print:hidden dark:border-slate-800 dark:bg-slate-950">
        <Select label="Class" value={filters.classId} options={classOptions.map((item) => ({ value: item.classId, label: item.className }))} onChange={(value) => setFilters((current) => ({ ...current, classId: value, sectionId: '', subjectId: '' }))} />
        <Select label="Section" value={filters.sectionId} options={sectionOptions.map((item) => ({ value: item.sectionId ?? '', label: item.sectionName ?? 'All sections' }))} onChange={(value) => setFilters((current) => ({ ...current, sectionId: value }))} />
        <Select label="Subject" value={filters.subjectId} options={subjectOptions.map((item) => ({ value: item.subjectId, label: item.subjectName }))} onChange={(value) => setFilters((current) => ({ ...current, subjectId: value }))} />
        <input aria-label="From date" type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} className="field-input" />
        <input aria-label="To date" type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} className="field-input" />
        <button type="button" onClick={() => void loadReports()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"><Search size={18} /> Apply</button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
        <Stat label="Average Attendance" value={`${summary.percentage}%`} />
        <Stat label="Total Records" value={summary.total} />
        <Stat label="Present Marks" value={summary.present} />
        <Stat label="Absent Marks" value={summary.absent} />
        <Stat label="Low Attendance" value={summary.low} tone="red" />
      </div>

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Attendance Trend</h3>
        <div className="flex h-36 items-end gap-3">
          {[summary.percentage, Math.max(summary.percentage - 5, 0), Math.min(summary.percentage + 3, 100), summary.percentage].map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-xl bg-blue-600" style={{ height: `${Math.max(value, 4)}%` }} />
              <span className="text-xs font-bold text-slate-500">W{index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {filteredRows.length === 0 ? (
          <div className="p-8"><EmptyState title="No report data" message="Reports appear after attendance is saved for your assigned students." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Section</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Present</th>
                  <th className="px-6 py-4">Late</th>
                  <th className="px-6 py-4">Excused</th>
                  <th className="px-6 py-4">Absent</th>
                  <th className="px-6 py-4">Attendance</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row) => (
                  <tr key={row.studentId}>
                    <td className="px-6 py-4"><p className="font-bold text-slate-900 dark:text-white">{row.studentName}</p><p className="font-mono text-xs text-slate-500">{row.rollNo}</p></td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{row.className}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{row.sectionName}</td>
                    <td className="px-6 py-4 font-bold">{row.total}</td>
                    <td className="px-6 py-4 font-bold">{row.present}</td>
                    <td className="px-6 py-4 font-bold">{row.late}</td>
                    <td className="px-6 py-4 font-bold">{row.excused}</td>
                    <td className="px-6 py-4 font-bold">{row.absent}</td>
                    <td className="px-6 py-4 font-black">{row.total === 0 ? 'No records' : `${row.percentage}%`}</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${row.total > 0 && row.percentage < 75 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{row.total > 0 && row.percentage < 75 ? 'Low' : 'Regular'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const unique = (items: TeacherAssignment[], key: keyof TeacherAssignment) => items.filter((item, index, list) => {
  const value = item[key] ?? '';
  return value !== '' && list.findIndex((candidate) => (candidate[key] ?? '') === value) === index;
});

const Select: React.FC<{ label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => (
  <select aria-label={`Filter by ${label}`} value={value} onChange={(event) => onChange(event.target.value)} className="field-input">
    <option value="">All {label.toLowerCase()}</option>
    {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
  </select>
);

const Stat: React.FC<{ label: string; value: string | number; tone?: 'blue' | 'red' }> = ({ label, value, tone = 'blue' }) => (
  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <p className={`text-xs font-black uppercase tracking-widest ${tone === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{label}</p>
    <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

const downloadBlob = (content: BlobPart | Blob, type: string, filename: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const toSimplePdf = (title: string, lines: string[]) => {
  const pageLines = [title, '', ...lines].slice(0, 44);
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    ...pageLines.map((line, index) => `${index === 0 ? '' : '0 -16 Td'}(${escapePdfText(line)}) Tj`),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let offset = '%PDF-1.4\n'.length;
  const xref = ['0000000000 65535 f '];
  const body = objects.map((object) => {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
    offset += object.length;
    return object;
  }).join('');
  const startXref = offset;
  return `%PDF-1.4\n${body}xref\n0 ${xref.length}\n${xref.join('\n')}\ntrailer\n<< /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
};

export const ProfessorReports = TeacherReports;
