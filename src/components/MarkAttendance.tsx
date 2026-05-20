import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  CheckCheck, 
  Send 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types';
import { toast, Toaster } from 'sonner';
import { WEBHOOK_URL } from '@/src/config';

const SUBJECTS = [
  "Computer Networks",
  "Operating Systems",
  "Database Systems",
  "Software Engineering",
  "Artificial Intelligence",
  "Cloud Computing"
];

export const MarkAttendance: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const fetchStudents = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStudents' })
      });
      
      if (!response.ok) throw new Error('Failed to fetch students');
      
      const data = await response.json();
      // Assuming data is an array of students or has a property containing them
      const studentList = Array.isArray(data) ? data : (data.students || []);
      setStudents(studentList);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(true);
      toast.error('Could not load student list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleMark = (rollNo: string, status: 'Present' | 'Absent') => {
    setAttendance(prev => ({ ...prev, [rollNo]: status }));
  };

  const markAllPresent = () => {
    const allPresent = students.reduce((acc, student) => {
      acc[student.rollNo] = 'Present';
      return acc;
    }, {} as Record<string, 'Present' | 'Absent'>);
    setAttendance(allPresent);
    toast.success('All students marked as Present');
  };

  const isAllMarked = students.length > 0 && Object.keys(attendance).length === students.length;

  const handleSubmit = async () => {
    if (!isAllMarked) return;

    setSubmitting(true);
    try {
      const payload = {
        action: 'markAttendance',
        date: today,
        subject: selectedSubject,
        professor: user?.name || 'Professor',
        students: students.map(s => ({
          studentName: s.name,
          rollNo: s.rollNo,
          phone: s.phone,
          parentPhone: s.parentPhone,
          status: attendance[s.rollNo]
        }))
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit attendance');

      setSuccess(true);
      toast.success('Attendance submitted successfully!');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setAttendance({});
        setSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('Error submitting attendance:', err);
      toast.error('Failed to submit attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold">Fetching student list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-slate-100 p-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4">
          <XCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to Load Students</h3>
        <p className="text-slate-500 mb-6 text-center max-w-xs">There was an error connecting to the server. Please check your connection.</p>
        <button 
          onClick={fetchStudents}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <RefreshCw size={20} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Toaster position="top-right" />
      
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Subject</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all bg-slate-50 font-bold text-slate-700 appearance-none"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Today's Date</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-bold">
              <CalendarIcon size={18} className="text-blue-600" />
              {today}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Professor</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-bold truncate">
              <UserIcon size={18} className="text-blue-600" />
              {user?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Student List Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Student List</h3>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {Object.keys(attendance).length} / {students.length} Marked
            </p>
          </div>
          <button 
            onClick={markAllPresent}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
          >
            <CheckCheck size={18} />
            Mark All Present
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {students.map((student) => (
            <div key={student.rollNo} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                  {student.rollNo}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{student.name}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Roll No: {student.rollNo}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleMark(student.rollNo, 'Present')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    attendance[student.rollNo] === 'Present'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'
                  }`}
                >
                  <CheckCircle size={18} />
                  Present
                </button>
                <button
                  onClick={() => handleMark(student.rollNo, 'Absent')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                    attendance[student.rollNo] === 'Absent'
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-red-200 hover:text-red-600'
                  }`}
                >
                  <XCircle size={18} />
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Section */}
      <div className="mt-8 flex flex-col items-center">
        {success && (
          <div className="mb-4 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 font-bold flex items-center gap-2 animate-bounce">
            <CheckCheck size={20} />
            Attendance Marked Successfully!
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={!isAllMarked || submitting || success}
          className={`
            w-full max-w-md flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl
            ${!isAllMarked || submitting || success
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20 active:scale-[0.98]'}
          `}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Submitting...
            </>
          ) : (
            <>
              <Send size={24} />
              Submit Attendance
            </>
          )}
        </button>
        {!isAllMarked && !loading && (
          <p className="mt-3 text-slate-400 text-sm font-bold">
            Please mark all {students.length} students to submit.
          </p>
        )}
      </div>
    </div>
  );
};
