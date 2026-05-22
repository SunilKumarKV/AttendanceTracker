import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Eye, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceSession, getAttendanceSessions, getTeacherAssignments, lockAttendanceSession, TeacherAssignment } from '../api/teacher';
import { ConfirmDialog, EmptyState, ErrorState, Loader, Pagination } from './common';

export const AttendanceHistory: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [filters, setFilters] = useState({ classId: '', sectionId: '', subjectId: '', fromDate: '', toDate: '', locked: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lockTarget, setLockTarget] = useState<AttendanceSession | null>(null);
  const pageSize = 10;

  const loadHistory = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResponse, sessionResponse] = await Promise.all([
        getTeacherAssignments(),
        getAttendanceSessions({ ...filters, locked: filters.locked || undefined, page: nextPage, pageSize }),
      ]);
      setAssignments(assignmentResponse.data);
      setSessions(sessionResponse.data.items);
      setTotal(sessionResponse.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance history.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadHistory(page);
  }, [loadHistory, page]);

  const applyFilters = () => {
    setPage(1);
    void loadHistory(1);
  };

  const lockSession = async () => {
    if (!lockTarget) return;
    try {
      await lockAttendanceSession(lockTarget.id);
      toast.success('Attendance locked.');
      await loadHistory(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lock attendance.');
    } finally {
      setLockTarget(null);
    }
  };

  const classOptions = useMemo(() => unique(assignments, 'classId'), [assignments]);
  const sectionOptions = useMemo(() => unique(assignments.filter((item) => !filters.classId || item.classId === filters.classId), 'sectionId'), [assignments, filters.classId]);
  const subjectOptions = useMemo(() => unique(assignments.filter((item) => !filters.classId || item.classId === filters.classId), 'subjectId'), [assignments, filters.classId]);

  if (loading && sessions.length === 0) return <Loader label="Loading attendance history..." />;
  if (error) return <ErrorState title="History unavailable" message={error} onAction={() => void loadHistory(page)} />;

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10"><CalendarDays size={24} /></div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Teacher Panel</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Attendance History</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Review, edit unlocked sessions, or lock finalized attendance.</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/mark-attendance')} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Take Attendance</button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-7 dark:border-slate-800 dark:bg-slate-950">
        <Select label="Class" value={filters.classId} options={classOptions.map((item) => ({ value: item.classId, label: item.className }))} onChange={(value) => setFilters((current) => ({ ...current, classId: value, sectionId: '', subjectId: '' }))} />
        <Select label="Section" value={filters.sectionId} options={sectionOptions.map((item) => ({ value: item.sectionId ?? '', label: item.sectionName ?? 'All sections' }))} onChange={(value) => setFilters((current) => ({ ...current, sectionId: value }))} />
        <Select label="Subject" value={filters.subjectId} options={subjectOptions.map((item) => ({ value: item.subjectId, label: item.subjectName }))} onChange={(value) => setFilters((current) => ({ ...current, subjectId: value }))} />
        <input aria-label="From date" type="date" value={filters.fromDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} className="field-input" />
        <input aria-label="To date" type="date" value={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} className="field-input" />
        <select aria-label="Lock status" value={filters.locked} onChange={(event) => setFilters((current) => ({ ...current, locked: event.target.value }))} className="field-input">
          <option value="">All sessions</option>
          <option value="false">Editable</option>
          <option value="true">Locked</option>
        </select>
        <button type="button" onClick={applyFilters} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"><Search size={18} /> Apply</button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {sessions.length === 0 ? (
          <div className="p-8"><EmptyState title="No attendance history" message="Saved sessions for your assigned classes will appear here. Use Take Attendance to create one." /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-4">Session</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Section</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Counts</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions.map((session) => {
                    const present = session.records.filter((record) => record.status === 'PRESENT').length;
                    const absent = session.records.filter((record) => record.status === 'ABSENT').length;
                    return (
                      <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{session.period}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{session.className}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{session.sectionName ?? 'All sections'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{session.subjectName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{new Date(session.sessionDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">P {present} / A {absent} / Total {session.records.length}</td>
                        <td className="px-6 py-4"><Badge locked={session.isLocked} /></td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => navigate(`/mark-attendance?session=${session.id}`)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label={`View ${session.subjectName} attendance`}><Eye size={18} /></button>
                            {!session.isLocked && <button type="button" onClick={() => setLockTarget(session)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" aria-label={`Lock ${session.subjectName} attendance`}><Lock size={18} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
      <ConfirmDialog open={Boolean(lockTarget)} title="Lock attendance?" message="Locked sessions cannot be edited afterwards." confirmLabel="Lock" destructive onCancel={() => setLockTarget(null)} onConfirm={() => void lockSession()} />
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

const Badge: React.FC<{ locked: boolean }> = ({ locked }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ${locked ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
    {locked && <Lock size={12} />}
    {locked ? 'Locked' : 'Editable'}
  </span>
);
