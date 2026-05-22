import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { getAttendanceSessions, getTeacherAssignments, getTeacherClassStudents, TeacherAssignment } from '../api/teacher';
import { Student } from '../types';
import { EmptyState, ErrorState, Loader, Pagination } from './common';

interface StudentRow extends Student {
  className: string;
  sectionName: string;
  semesterName: string;
  totalClasses: number;
  attended: number;
  attendancePercentage: number;
}

export const TeacherStudents: React.FC = () => {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 10;

  const loadStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, sessionsResponse] = await Promise.all([
        getTeacherAssignments(),
        getAttendanceSessions({ page: 1, pageSize: 100 }),
      ]);
      setAssignments(assignmentResponse.data);
      const groups = await Promise.all(assignmentResponse.data.map(async (assignment) => ({
        assignment,
        students: (await getTeacherClassStudents(assignment.classId, assignment.sectionId)).data,
      })));
      const rows = new Map<string, StudentRow>();
      groups.forEach(({ assignment, students: assignedStudents }) => {
        assignedStudents.forEach((student) => {
          if (!student.id || rows.has(student.id)) return;
          rows.set(student.id, {
            ...student,
            className: assignment.className,
            sectionName: assignment.sectionName ?? 'All sections',
            semesterName: assignment.semesterName ?? 'All semesters',
            totalClasses: 0,
            attended: 0,
            attendancePercentage: 0,
          });
        });
      });
      sessionsResponse.data.items.forEach((session) => {
        session.records.forEach((record) => {
          const row = rows.get(record.studentId);
          if (!row) return;
          row.totalClasses += 1;
          if (record.status !== 'ABSENT') row.attended += 1;
        });
      });
      rows.forEach((row) => {
        row.attendancePercentage = row.totalClasses === 0 ? 0 : Number(((row.attended / row.totalClasses) * 100).toFixed(1));
      });
      setStudents([...rows.values()].sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load assigned students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [classFilter, sectionFilter, search]);

  const filtered = useMemo(() => students.filter((student) => (
    (!classFilter || student.courseId === classFilter)
    && (!sectionFilter || student.sectionId === sectionFilter)
    && `${student.name} ${student.rollNo}`.toLowerCase().includes(search.toLowerCase())
  )), [classFilter, search, sectionFilter, students]);

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const classOptions = assignments.filter((assignment, index, list) => list.findIndex((item) => item.classId === assignment.classId) === index);
  const sectionOptions = assignments.filter((assignment, index, list) => assignment.sectionId && list.findIndex((item) => item.sectionId === assignment.sectionId) === index);

  if (loading) return <Loader label="Loading assigned students..." />;
  if (error) return <ErrorState title="Students unavailable" message={error} onAction={loadStudents} />;
  if (assignments.length === 0) return <EmptyState title="No academic assignments found" message="Ask administrator to assign your classes and subjects before viewing students." />;

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <Header />
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input aria-label="Search assigned students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll number" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 font-semibold outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900" />
        </div>
        <select aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="field-input">
          <option value="">All classes</option>
          {classOptions.map((assignment) => <option key={assignment.classId} value={assignment.classId}>{assignment.className}</option>)}
        </select>
        <select aria-label="Filter by section" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className="field-input">
          <option value="">All sections</option>
          {sectionOptions.map((assignment) => <option key={assignment.sectionId ?? assignment.id} value={assignment.sectionId ?? ''}>{assignment.sectionName}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {filtered.length === 0 ? (
          <div className="p-8"><EmptyState title="No assigned students match" message="Adjust search or filters. If no students exist, ask administrator to add students to your assigned class and section." /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Roll No</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Section</th>
                    <th className="px-6 py-4">Semester</th>
                    <th className="px-6 py-4">Attendance</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visible.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{student.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{student.rollNo}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{student.className}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{student.sectionName}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{student.semesterName}</td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{student.totalClasses === 0 ? 'No records' : `${student.attendancePercentage}%`}</td>
                      <td className="px-6 py-4"><Badge low={student.totalClasses > 0 && student.attendancePercentage < 75} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

const Header = () => (
  <div className="mb-8 flex items-start gap-4">
    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10"><Users size={24} /></div>
    <div>
      <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Panel</p>
      <h2 className="text-3xl font-black text-slate-900 dark:text-white">My Students</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">Only students from your assigned classes and sections are shown.</p>
    </div>
  </div>
);

const Badge: React.FC<{ low: boolean }> = ({ low }) => (
  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${low ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
    {low ? 'Low attendance' : 'Regular'}
  </span>
);

export const ProfessorStudents = TeacherStudents;
