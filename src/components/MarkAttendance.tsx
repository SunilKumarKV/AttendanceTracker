import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  CheckCheck,
  Eraser,
  Lock,
  Loader2,
  Save,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AttendanceRecordInput,
  AttendanceSession,
  createAttendanceSession,
  getAttendanceSession,
  getAttendanceSessions,
  getTeacherAssignments,
  getTeacherClassStudents,
  lockAttendanceSession,
  TeacherAssignment,
  updateAttendanceSession,
} from '../api/teacher';
import { AttendanceStatus, Student } from '../types';
import { ConfirmDialog, EmptyState, ErrorState, Loader } from './common';

const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
const todayValue = () => new Date().toISOString().slice(0, 10);
const dateInputValue = (value: string | Date) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const uniqueBy = <T,>(items: T[], key: (item: T) => string | null | undefined) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item) ?? '';
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const MarkAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<AttendanceSession[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionDate, setSessionDate] = useState(todayValue());
  const [period, setPeriod] = useState('Period 1');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);

  const selectedAssignment = useMemo(() => (
    assignments.find((assignment) => (
      assignment.classId === selectedClassId
      && assignment.subjectId === selectedSubjectId
      && (assignment.sectionId ?? '') === selectedSectionId
      && (assignment.semesterId ?? '') === selectedSemesterId
    )) ?? null
  ), [assignments, selectedClassId, selectedSectionId, selectedSemesterId, selectedSubjectId]);

  const classOptions = useMemo(() => uniqueBy(assignments, (item) => item.classId), [assignments]);
  const semesterOptions = useMemo(() => uniqueBy(assignments.filter((item) => item.classId === selectedClassId), (item) => item.semesterId ?? 'none'), [assignments, selectedClassId]);
  const sectionOptions = useMemo(() => uniqueBy(assignments.filter((item) => item.classId === selectedClassId && (item.semesterId ?? '') === selectedSemesterId), (item) => item.sectionId ?? 'none'), [assignments, selectedClassId, selectedSemesterId]);
  const subjectOptions = useMemo(() => assignments.filter((item) => item.classId === selectedClassId && (item.semesterId ?? '') === selectedSemesterId && (item.sectionId ?? '') === selectedSectionId), [assignments, selectedClassId, selectedSectionId, selectedSemesterId]);

  const duplicateSession = useMemo(() => history.find((session) => (
    !editingSession
    && session.classId === selectedClassId
    && session.subjectId === selectedSubjectId
    && (session.sectionId ?? '') === selectedSectionId
    && dateInputValue(session.sessionDate) === sessionDate
    && session.period === period
  )), [editingSession, history, period, selectedClassId, selectedSectionId, selectedSubjectId, sessionDate]);

  const visibleStudents = useMemo(() => (
    [...students]
      .filter((student) => `${student.name} ${student.rollNo}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true }))
  ), [search, students]);

  const markedCount = students.filter((student) => student.id && attendance[student.id]).length;
  const unmarkedCount = Math.max(students.length - markedCount, 0);
  const isLocked = Boolean(editingSession?.isLocked);
  const canSave = Boolean(selectedAssignment) && students.length > 0 && unmarkedCount === 0 && !duplicateSession && !isLocked;

  const applyAssignment = (assignment: TeacherAssignment | null) => {
    setSelectedClassId(assignment?.classId ?? '');
    setSelectedSemesterId(assignment?.semesterId ?? '');
    setSelectedSectionId(assignment?.sectionId ?? '');
    setSelectedSubjectId(assignment?.subjectId ?? '');
  };

  const loadStudents = useCallback(async (assignment: TeacherAssignment | null, keepMarks = false) => {
    if (!assignment) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    try {
      const response = await getTeacherClassStudents(assignment.classId, assignment.sectionId);
      setStudents(response.data);
      if (!keepMarks) {
        setAttendance({});
        setRemarks({});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load assigned students.');
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, historyResponse] = await Promise.all([
        getTeacherAssignments(),
        getAttendanceSessions({ page: 1, pageSize: 100 }),
      ]);
      setAssignments(assignmentResponse.data);
      setHistory(historyResponse.data.items);
      if (sessionId) {
        const sessionResponse = await getAttendanceSession(sessionId);
        const session = sessionResponse.data;
        setEditingSession(session);
        setSessionDate(dateInputValue(session.sessionDate));
        setPeriod(session.period);
        setTopic(session.topic ?? '');
        setNotes(session.notes ?? '');
        setAttendance(session.records.reduce((acc, record) => ({ ...acc, [record.studentId]: record.status }), {} as Record<string, AttendanceStatus>));
        setRemarks(session.records.reduce((acc, record) => ({ ...acc, [record.studentId]: record.remarks ?? '' }), {} as Record<string, string>));
        applyAssignment(assignmentResponse.data.find((assignment) => (
          assignment.classId === session.classId
          && assignment.subjectId === session.subjectId
          && (assignment.sectionId ?? '') === (session.sectionId ?? '')
        )) ?? null);
      } else {
        applyAssignment(assignmentResponse.data[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance workspace.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!loading) void loadStudents(selectedAssignment, Boolean(editingSession));
  }, [editingSession, loadStudents, loading, selectedAssignment]);

  const refreshHistory = async () => {
    const response = await getAttendanceSessions({ page: 1, pageSize: 100 });
    setHistory(response.data.items);
  };

  const updateClass = (classId: string) => {
    const next = assignments.find((assignment) => assignment.classId === classId) ?? null;
    applyAssignment(next);
    setEditingSession(null);
  };

  const updateSemester = (semesterId: string) => {
    const next = assignments.find((assignment) => assignment.classId === selectedClassId && (assignment.semesterId ?? '') === semesterId) ?? null;
    applyAssignment(next);
    setEditingSession(null);
  };

  const updateSection = (sectionId: string) => {
    const next = assignments.find((assignment) => assignment.classId === selectedClassId && (assignment.semesterId ?? '') === selectedSemesterId && (assignment.sectionId ?? '') === sectionId) ?? null;
    applyAssignment(next);
    setEditingSession(null);
  };

  const startNew = () => {
    setEditingSession(null);
    setAttendance({});
    setRemarks({});
    setTopic('');
    setNotes('');
    setSessionDate(todayValue());
    setPeriod('Period 1');
    navigate('/mark-attendance');
  };

  const markAll = (status: AttendanceStatus) => {
    if (isLocked) return;
    setAttendance(students.reduce((acc, student) => student.id ? { ...acc, [student.id]: status } : acc, {} as Record<string, AttendanceStatus>));
  };

  const clearAll = () => {
    if (isLocked) return;
    setAttendance({});
    setRemarks({});
  };

  const buildRecords = (): AttendanceRecordInput[] => students.map((student) => ({
    studentId: student.id!,
    status: attendance[student.id!] ?? 'ABSENT',
    remarks: remarks[student.id!] || null,
  }));

  const saveAttendance = async () => {
    if (!selectedAssignment || !canSave) return;
    setSubmitting(true);
    try {
      if (editingSession) {
        const response = await updateAttendanceSession(editingSession.id, { topic, notes, records: buildRecords() });
        setEditingSession(response.data);
        toast.success('Attendance updated.');
      } else {
        const response = await createAttendanceSession({
          courseId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          semesterId: selectedAssignment.semesterId,
          sectionId: selectedAssignment.sectionId,
          sessionDate,
          period,
          topic,
          notes,
          records: buildRecords(),
        });
        setEditingSession(response.data);
        navigate(`/mark-attendance?session=${response.data.id}`, { replace: true });
        toast.success('Attendance saved successfully.');
      }
      await refreshHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save attendance.');
    } finally {
      setSubmitting(false);
      setConfirmSave(false);
    }
  };

  const lockSession = async () => {
    if (!editingSession) return;
    setSubmitting(true);
    try {
      const response = await lockAttendanceSession(editingSession.id);
      setEditingSession(response.data);
      toast.success('Attendance locked.');
      await refreshHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lock attendance.');
    } finally {
      setSubmitting(false);
      setConfirmLock(false);
    }
  };

  if (loading) return <Loader label="Loading attendance workflow..." />;
  if (error) return <ErrorState title="Attendance unavailable" message={error} onAction={loadInitial} />;
  if (assignments.length === 0) {
    return (
      <EmptyState
        title="No academic assignments found"
        message="Ask administrator to assign your classes and subjects before taking attendance."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Workflow</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Take Attendance</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Select an assigned class, load students, mark each status, then save or lock the session.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/attendance-history')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">View History</button>
          {editingSession && <button type="button" onClick={startNew} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">New Attendance</button>}
        </div>
      </div>

      <section className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10"><BookOpen size={22} /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Step 1: Select Session</h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Only administrator-assigned combinations are available.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Select label="Class" value={selectedClassId} onChange={updateClass} disabled={isLocked} options={classOptions.map((item) => ({ value: item.classId, label: item.className }))} />
          <Select label="Semester" value={selectedSemesterId} onChange={updateSemester} disabled={isLocked} options={semesterOptions.map((item) => ({ value: item.semesterId ?? '', label: item.semesterName ?? 'All semesters' }))} />
          <Select label="Section" value={selectedSectionId} onChange={updateSection} disabled={isLocked} options={sectionOptions.map((item) => ({ value: item.sectionId ?? '', label: item.sectionName ?? 'All sections' }))} />
          <Select label="Subject" value={selectedSubjectId} onChange={setSelectedSubjectId} disabled={isLocked} options={subjectOptions.map((item) => ({ value: item.subjectId, label: item.subjectName }))} />
          <Field label="Date"><input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} disabled={Boolean(editingSession)} className="field-input" /></Field>
          <Field label="Period / Session"><input value={period} onChange={(event) => setPeriod(event.target.value)} disabled={Boolean(editingSession)} className="field-input" /></Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Topic"><input value={topic} onChange={(event) => setTopic(event.target.value)} disabled={isLocked} placeholder="Topic covered" className="field-input" /></Field>
          <Field label="Session Notes"><input value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isLocked} placeholder="Optional session note" className="field-input" /></Field>
        </div>
        {!selectedAssignment && (
          <Warning message="Invalid assignment combination. Choose a class, section, semester, and subject assigned by the administrator." />
        )}
        {duplicateSession && (
          <Warning message="Attendance already exists for this date, class, section, subject, and period. Open it from Attendance History to review or edit if unlocked." />
        )}
        {isLocked && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Lock size={18} /> Locked session. Attendance can be viewed but not edited.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Step 2: Mark Students</h3>
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">{markedCount} / {students.length} marked</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input aria-label="Search students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll no" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-blue-500 sm:w-64 dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <button type="button" onClick={() => markAll('PRESENT')} disabled={isLocked || students.length === 0} className="tool-button text-emerald-700"><CheckCheck size={18} /> All Present</button>
            <button type="button" onClick={() => markAll('ABSENT')} disabled={isLocked || students.length === 0} className="tool-button text-red-700"><Users size={18} /> All Absent</button>
            <button type="button" onClick={clearAll} disabled={isLocked || students.length === 0} className="tool-button text-slate-700"><Eraser size={18} /> Clear</button>
          </div>
        </div>

        {studentsLoading ? (
          <div className="p-12 text-center text-slate-600"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />Loading assigned students...</div>
        ) : students.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No students in this assignment" message="Ask administrator to add active students to this class and section before taking attendance." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleStudents.map((student) => (
              <div key={student.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,320px)] lg:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{student.rollNo}</div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{student.name}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Roll No {student.rollNo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={isLocked}
                      onClick={() => student.id && setAttendance((current) => ({ ...current, [student.id!]: status }))}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition-all disabled:cursor-not-allowed disabled:opacity-60 ${student.id && attendance[student.id] === status ? statusClass(status) : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <textarea
                  value={student.id ? remarks[student.id] ?? '' : ''}
                  onChange={(event) => student.id && setRemarks((current) => ({ ...current, [student.id!]: event.target.value }))}
                  disabled={isLocked}
                  aria-label={`Remarks for ${student.name}`}
                  placeholder="Remarks"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {unmarkedCount > 0 && students.length > 0 && (
        <Warning message={`${unmarkedCount} student${unmarkedCount === 1 ? '' : 's'} still unmarked. Mark every student before saving attendance.`} />
      )}

      <div className="sticky bottom-0 mt-8 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {editingSession ? `Editing ${editingSession.subjectName} on ${new Date(editingSession.sessionDate).toLocaleDateString()}` : 'Ready to save a new attendance session.'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {editingSession && !isLocked && (
              <button type="button" onClick={() => setConfirmLock(true)} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                <Lock size={18} /> Lock Attendance
              </button>
            )}
            <button type="button" onClick={() => setConfirmSave(true)} disabled={!canSave || submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {editingSession ? 'Save Changes' : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title={editingSession ? 'Save attendance changes?' : 'Save attendance?'}
        message="This will persist the marked statuses and remarks for every student in this session."
        confirmLabel="Save"
        onCancel={() => setConfirmSave(false)}
        onConfirm={() => void saveAttendance()}
      />
      <ConfirmDialog
        open={confirmLock}
        title="Lock attendance?"
        message="Locked attendance cannot be edited afterwards. Review statuses before continuing."
        confirmLabel="Lock"
        destructive
        onCancel={() => setConfirmLock(false)}
        onConfirm={() => void lockSession()}
      />
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="space-y-1.5">
    <span className="ml-1 block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
    {children}
  </label>
);

const Select: React.FC<{ label: string; value: string; options: { value: string; label: string }[]; disabled?: boolean; onChange: (value: string) => void }> = ({ label, value, options, disabled, onChange }) => (
  <Field label={label}>
    <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="field-input appearance-none">
      {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
    </select>
  </Field>
);

const Warning: React.FC<{ message: string }> = ({ message }) => (
  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
    <AlertTriangle className="mt-0.5 shrink-0" size={18} />
    {message}
  </div>
);

const statusClass = (status: AttendanceStatus) => {
  if (status === 'PRESENT') return 'border-emerald-600 bg-emerald-600 text-white';
  if (status === 'ABSENT') return 'border-red-600 bg-red-600 text-white';
  if (status === 'LATE') return 'border-blue-600 bg-blue-600 text-white';
  return 'border-amber-600 bg-amber-600 text-white';
};
