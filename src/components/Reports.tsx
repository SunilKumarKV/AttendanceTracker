import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Filter,
  ArrowRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { toast, Toaster } from 'sonner';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WEBHOOK_URL } from '@/src/config';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StudentReport {
  studentName: string;
  rollNo: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercentage: number;
  status: 'Regular' | 'Shortage';
}

interface ReportData {
  summary: {
    totalClasses: number;
    averageAttendance: number;
    overallPresent: number;
    overallAbsent: number;
  };
  students: StudentReport[];
}

export const Reports: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const subjects = ['All Subjects', 'Mathematics', 'Physics', 'Computer Science', 'Digital Electronics', 'Data Structures'];

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getReport',
          fromDate,
          toDate,
          subject
        })
      });

      if (!response.ok) throw new Error('Failed to fetch report');

      const data = await response.json();
      setReportData(data);
      toast.success('Report generated successfully');
    } catch (err) {
      console.error('Error fetching report:', err);
      toast.error('Could not generate report. Showing sample data.');
      
      // Sample data for demonstration
      setReportData({
        summary: {
          totalClasses: 45,
          averageAttendance: 78.5,
          overallPresent: 353,
          overallAbsent: 97
        },
        students: [
          { studentName: 'John Doe', rollNo: 'CS101', totalClasses: 45, present: 40, absent: 5, attendancePercentage: 88.8, status: 'Regular' },
          { studentName: 'Jane Smith', rollNo: 'CS102', totalClasses: 45, present: 30, absent: 15, attendancePercentage: 66.6, status: 'Shortage' },
          { studentName: 'Michael Brown', rollNo: 'CS103', totalClasses: 45, present: 42, absent: 3, attendancePercentage: 93.3, status: 'Regular' },
          { studentName: 'Sarah Lee', rollNo: 'CS104', totalClasses: 45, present: 32, absent: 13, attendancePercentage: 71.1, status: 'Shortage' },
          { studentName: 'David Wilson', rollNo: 'CS105', totalClasses: 45, present: 38, absent: 7, attendancePercentage: 84.4, status: 'Regular' },
          { studentName: 'Emma Watson', rollNo: 'CS106', totalClasses: 45, present: 25, absent: 20, attendancePercentage: 55.5, status: 'Shortage' },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;

    const csvData = (reportData.students || []).map(s => ({
      'Student Name': s.studentName || 'Unknown',
      'Roll No': s.rollNo || 'N/A',
      'Total Classes': s.totalClasses || 0,
      'Present': s.present || 0,
      'Absent': s.absent || 0,
      'Attendance %': `${s.attendancePercentage || 0}%`,
      'Status': s.status || 'Regular'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${subject}_${fromDate}_to_${toDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    window.print();
  };

  const pieData = useMemo(() => {
    if (!reportData) return [];
    return [
      { name: 'Present', value: reportData.summary.overallPresent },
      { name: 'Absent', value: reportData.summary.overallAbsent },
    ];
  }, [reportData]);

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="max-w-7xl mx-auto pb-20 print:p-0">
      <Toaster position="top-right" />
      
      {/* Header - Hidden in Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Attendance Reports</h2>
          <p className="text-slate-500 font-medium">Generate detailed attendance analytics and summaries.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportPDF}
            disabled={!reportData}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer size={18} />
            Export PDF
          </button>
          <button 
            onClick={exportCSV}
            disabled={!reportData}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters - Hidden in Print */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-8 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">From Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">To Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none bg-white"
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button 
            onClick={fetchReport}
            disabled={loading}
            className="bg-blue-600 text-white h-[50px] rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Filter size={20} />}
            Apply Filters
          </button>
        </div>
      </div>

      {reportData ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <BookOpen size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Classes</p>
                <h3 className="text-4xl font-black text-slate-900">{reportData.summary.totalClasses}</h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center",
                reportData.summary.averageAttendance >= 75 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                {reportData.summary.averageAttendance >= 75 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Average Attendance</p>
                <h3 className="text-4xl font-black text-slate-900">{reportData.summary.averageAttendance}%</h3>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Student Attendance Summary</h3>
              <div className="flex gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  <CheckCircle2 size={12} /> Regular (≥75%)
                </div>
                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <XCircle size={12} /> Shortage (&lt;75%)
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-5">Student Name</th>
                    <th className="px-6 py-5">Roll No</th>
                    <th className="px-6 py-5 text-center">Total Classes</th>
                    <th className="px-6 py-5 text-center">Present</th>
                    <th className="px-6 py-5 text-center">Absent</th>
                    <th className="px-6 py-5 text-center">Attendance %</th>
                    <th className="px-6 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.students.map((student, idx) => (
                    <tr 
                      key={idx} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        student.attendancePercentage < 75 && "bg-red-50/30"
                      )}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">{student.studentName}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                      <td className="px-6 py-4 text-center font-medium text-slate-600">{student.totalClasses}</td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">{student.present}</td>
                      <td className="px-6 py-4 text-center font-bold text-red-500">{student.absent}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn(
                            "font-black text-lg",
                            student.attendancePercentage < 75 ? "text-red-600" : "text-slate-900"
                          )}>
                            {student.attendancePercentage}%
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                student.attendancePercentage < 75 ? "bg-red-500" : "bg-emerald-500"
                              )} 
                              style={{ width: `${student.attendancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          student.status === 'Regular' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm lg:col-span-1">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Overall Distribution</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Student Attendance Comparison</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.students}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="studentName" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="attendancePercentage" 
                      name="Attendance %"
                      radius={[6, 6, 0, 0]}
                    >
                      {reportData.students.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.attendancePercentage < 75 ? '#ef4444' : '#3b82f6'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-20 rounded-[40px] border border-slate-100 shadow-sm text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto">
              <FileText size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Generate Your Report</h3>
              <p className="text-slate-500 font-medium">Select a date range and subject above to view detailed attendance analytics and student summaries.</p>
            </div>
            <div className="flex items-center justify-center gap-4 text-slate-400 text-sm font-bold uppercase tracking-widest">
              <span>Select Date</span>
              <ArrowRight size={16} />
              <span>Choose Subject</span>
              <ArrowRight size={16} />
              <span>Apply</span>
            </div>
          </div>
        </div>
      )}

      {/* Print-only Header */}
      <div className="hidden print:block mb-10">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900">AttendanceTracker Report</h1>
            <p className="text-slate-500 font-bold mt-1">Subject: {subject} | Period: {fromDate} to {toDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated On</p>
            <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
