import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { createCorrectionRequest, createLeaveRequest, getAttendanceSessions, getProfessorAssignments, getProfessorClassStudents, ProfessorAssignment, AttendanceSession } from '../api/professor';
import { AttendanceStatus, Student } from '../types';
import { EmptyState, ErrorState, Loader } from './common';

const todayValue = () => new Date().toISOString().slice(0, 10);
const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export const TeacherRequests: React.FC = () => {
  const [assignments, setAssignments] = useState<ProfessorAssignment[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [studentId, setStudentId] = useState('');
  const [fromDate, setFromDate] = useState(todayValue());
  const [toDate, setToDate] = useState(todayValue());
  const [leaveReason, setLeaveReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedSession = useMemo(() => sessions.find((session) => session.id === selectedSessionId), [selectedSessionId, sessions]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [assignmentRes, sessionRes] = await Promise.all([getProfessorAssignments(), getAttendanceSessions({ page: 1, pageSize: 50 })]);
        setAssignments(assignmentRes.data);
        setSessions(sessionRes.data.items);
        setSelectedSessionId(sessionRes.data.items[0]?.id ?? '');
        const firstAssignment = assignmentRes.data[0];
        if (firstAssignment) {
          const studentRes = await getProfessorClassStudents(firstAssignment.classId, firstAssignment.sectionId);
          setStudents(studentRes.data);
          setStudentId(studentRes.data[0]?.id ?? '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load request workspace.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const submitCorrection = async () => {
    if (!selectedSessionId || !correctionReason.trim()) return toast.error('Session and reason are required.');
    setSubmitting(true);
    try {
      const record = selectedSession?.records.find((item) => item.id === selectedRecordId);
      await createCorrectionRequest({ sessionId: selectedSessionId, attendanceRecordId: selectedRecordId || null, studentId: record?.studentId ?? null, requestedStatus, reason: correctionReason });
      setCorrectionReason('');
      toast.success('Correction request submitted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit correction request.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLeave = async () => {
    if (!studentId || !leaveReason.trim()) return toast.error('Student and reason are required.');
    setSubmitting(true);
    try {
      await createLeaveRequest({ studentId, fromDate, toDate, reason: leaveReason });
      setLeaveReason('');
      toast.success('Leave request submitted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader label="Loading request workspace..." />;
  if (error) return <ErrorState title="Requests unavailable" message={error} />;
  if (assignments.length === 0) return <EmptyState title="No assignments" message="Assignments are required before correction or leave requests can be submitted." />;

  return <div className="mx-auto max-w-5xl space-y-8 pb-12"><div><p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Requests</p><h2 className="text-3xl font-black text-slate-900 dark:text-white">Corrections & Leave</h2><p className="mt-1 text-slate-600 dark:text-slate-300">Submit attendance correction requests and student leave requests for admin approval.</p></div><section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h3 className="mb-4 text-lg font-bold">Attendance Correction Request</h3><div className="grid gap-4 md:grid-cols-2"><select value={selectedSessionId} onChange={(e) => { setSelectedSessionId(e.target.value); setSelectedRecordId(''); }} className="field-input"><option value="">Select session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.subjectName} • {new Date(session.sessionDate).toLocaleDateString()} • {session.period}</option>)}</select><select value={selectedRecordId} onChange={(e) => setSelectedRecordId(e.target.value)} className="field-input"><option value="">Full session / no student</option>{selectedSession?.records.map((record) => <option key={record.id} value={record.id}>{record.studentName} ({record.status})</option>)}</select><select value={requestedStatus} onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)} className="field-input">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><input value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Reason required" className="field-input" /></div><button disabled={submitting} onClick={submitCorrection} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Send size={18} />Submit Correction</button></section><section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h3 className="mb-4 text-lg font-bold">Student Leave Request</h3><div className="grid gap-4 md:grid-cols-2"><select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="field-input">{students.map((student) => <option key={student.id} value={student.id}>{student.name} • Roll {student.rollNo}</option>)}</select><input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Reason required" className="field-input" /><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="field-input" /><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="field-input" /></div><button disabled={submitting} onClick={submitLeave} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Send size={18} />Submit Leave</button></section></div>;
};
