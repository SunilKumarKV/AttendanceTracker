import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckCheck,
  Lock,
  Loader2,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  AttendanceRecordInput,
  AttendanceSession,
  createAttendanceSession,
  getAttendanceSessions,
  getProfessorAssignments,
  getProfessorClassStudents,
  lockAttendanceSession,
  ProfessorAssignment,
  updateAttendanceSession,
} from '../api/professor';
import { useAuth } from '../context/AuthContext';
import { AttendanceStatus, Student } from '../types';
import { EmptyState, ErrorState, Loader } from './common';

const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export const MarkAttendance: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ProfessorAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<AttendanceSession[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const todayValue = new Date().toISOString().slice(0, 10);
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const loadInitial = async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, historyResponse] = await Promise.all([
        getProfessorAssignments(),
        getAttendanceSessions(),
      ]);
      setAssignments(assignmentResponse.data);
      setHistory(historyResponse.data.items);
      setSelectedAssignmentId(assignmentResponse.data[0]?.id ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = useCallback(async (assignment: ProfessorAssignment | null) => {
    if (!assignment) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    try {
      const response = await getProfessorClassStudents(assignment.classId, assignment.sectionId);
      setStudents(response.data);
      setAttendance({});
      setRemarks({});
      setEditingSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load students.');
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (!loading) void loadStudents(selectedAssignment);
  }, [loadStudents, loading, selectedAssignment, selectedAssignmentId]);

  const handleMark = (studentId: string, status: AttendanceStatus) => {
    if (editingSession?.isLocked) return;
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    if (editingSession?.isLocked) return;
    setAttendance(students.reduce((acc, student) => ({ ...acc, [student.id!]: 'PRESENT' as AttendanceStatus }), {}));
    toast.success('All students marked as present');
  };

  const isAllMarked = students.length > 0 && students.every(student => student.id && attendance[student.id]);

  const buildRecords = (): AttendanceRecordInput[] => students.map(student => ({
    studentId: student.id!,
    status: attendance[student.id!] ?? 'ABSENT',
    remarks: remarks[student.id!] || null,
  }));

  const refreshHistory = async () => {
    const response = await getAttendanceSessions();
    setHistory(response.data.items);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !isAllMarked || editingSession?.isLocked) return;
    setSubmitting(true);
    try {
      if (editingSession) {
        const response = await updateAttendanceSession(editingSession.id, {
          topic,
          notes,
          records: buildRecords(),
        });
        setEditingSession(response.data);
        toast.success('Attendance updated successfully.');
      } else {
        const response = await createAttendanceSession({
          courseId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          semesterId: selectedAssignment.semesterId,
          sectionId: selectedAssignment.sectionId,
          sessionDate: todayValue,
          topic,
          notes,
          records: buildRecords(),
        });
        setEditingSession(response.data);
        toast.success('Attendance saved successfully.');
      }
      await refreshHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSession = async (session: AttendanceSession) => {
    const assignment = assignments.find(item => item.classId === session.classId && item.subjectId === session.subjectId);
    if (assignment) {
      setSelectedAssignmentId(assignment.id);
    }
    setEditingSession(session);
    setTopic(session.topic ?? '');
    setNotes(session.notes ?? '');
    setAttendance(session.records.reduce((acc, record) => ({ ...acc, [record.studentId]: record.status }), {} as Record<string, AttendanceStatus>));
    setRemarks(session.records.reduce((acc, record) => ({ ...acc, [record.studentId]: record.remarks ?? '' }), {} as Record<string, string>));
  };

  const handleLock = async () => {
    if (!editingSession) return;
    setSubmitting(true);
    try {
      const response = await lockAttendanceSession(editingSession.id);
      setEditingSession(response.data);
      toast.success('Attendance session locked.');
      await refreshHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lock attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading attendance workspace..." />;
  if (error) return <ErrorState title="Attendance unavailable" message={error} onAction={loadInitial} />;
  if (assignments.length === 0) return <EmptyState title="No assigned classes" message="Ask an admin to assign classes and subjects before marking attendance." />;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Toaster position="top-right" />

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Assigned Subject</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                disabled={Boolean(editingSession)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-slate-50 font-bold text-slate-700 appearance-none disabled:text-slate-400"
              >
                {assignments.map(assignment => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignment.subjectName} - {assignment.className}{assignment.sectionName ? ` (${assignment.sectionName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Info label="Today's Date" icon={<CalendarIcon size={18} />} value={today} />
          <Info label="Professor" icon={<UserIcon size={18} />} value={user?.name ?? 'Professor'} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={editingSession?.isLocked} placeholder="Topic covered" className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium disabled:text-slate-400" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={editingSession?.isLocked} placeholder="Session notes" className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium disabled:text-slate-400" />
        </div>
        {editingSession?.isLocked && (
          <div className="mt-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl px-4 py-3 font-bold flex items-center gap-2">
            <Lock size={18} />
            This attendance session is locked and cannot be edited.
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Student List</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {Object.keys(attendance).length} / {students.length} Marked
            </p>
          </div>
          <button onClick={markAllPresent} disabled={editingSession?.isLocked} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 disabled:opacity-50">
            <CheckCheck size={18} />
            Mark All Present
          </button>
        </div>
        {studentsLoading ? (
          <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />Loading students...</div>
        ) : students.length === 0 ? (
          <div className="p-6"><EmptyState title="No students" message="No active students found for this assigned class." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => (
              <div key={student.id} className="p-4 sm:p-6 flex flex-col gap-4 hover:bg-slate-50/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">{student.rollNo}</div>
                    <div>
                      <h4 className="font-bold text-slate-900">{student.name}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Roll No: {student.rollNo}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    {statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => student.id && handleMark(student.id, status)}
                        disabled={editingSession?.isLocked}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border disabled:opacity-50 ${
                          student.id && attendance[student.id] === status
                            ? status === 'PRESENT' ? 'bg-emerald-600 text-white border-emerald-600'
                              : status === 'ABSENT' ? 'bg-red-600 text-white border-red-600'
                                : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-400 border-slate-200 hover:text-blue-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={student.id ? remarks[student.id] ?? '' : ''}
                  onChange={(e) => student.id && setRemarks(prev => ({ ...prev, [student.id!]: e.target.value }))}
                  disabled={editingSession?.isLocked}
                  placeholder="Remarks"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm disabled:text-slate-400"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
        {editingSession && !editingSession.isLocked && (
          <button onClick={handleLock} disabled={submitting} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
            <Lock size={20} />
            Lock Session
          </button>
        )}
        <button onClick={handleSubmit} disabled={!isAllMarked || submitting || Boolean(editingSession?.isLocked)} className="w-full max-w-md flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed">
          {submitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
          {editingSession ? 'Update Attendance' : 'Save Attendance'}
        </button>
      </div>

      <div className="mt-10 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Attendance History</h3>
          {editingSession && <button onClick={() => { setEditingSession(null); setAttendance({}); setRemarks({}); setTopic(''); setNotes(''); }} className="text-sm font-bold text-blue-600">New Session</button>}
        </div>
        {history.length === 0 ? (
          <div className="p-6"><EmptyState title="No sessions yet" message="Saved attendance sessions will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map(session => (
              <button key={session.id} onClick={() => void handleEditSession(session)} className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50">
                <div>
                  <p className="font-bold text-slate-900">{session.subjectName} - {session.className}</p>
                  <p className="text-sm text-slate-500">{new Date(session.sessionDate).toLocaleDateString()} · {session.records.length} records</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${session.isLocked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {session.isLocked ? 'LOCKED' : 'EDITABLE'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; icon: React.ReactNode; value: string }> = ({ label, icon, value }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">{label}</label>
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-bold truncate">
      <span className="text-blue-600">{icon}</span>
      {value}
    </div>
  </div>
);
