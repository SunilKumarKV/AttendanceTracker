import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Inbox
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WEBHOOK_URL } from '@/src/config';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Notification {
  id: string;
  timestamp: string;
  studentName: string;
  rollNo: string;
  attendancePercentage: number;
  message: string;
  type: 'Warning' | 'Critical' | 'Monthly Report';
  status: 'Delivered' | 'Failed';
}

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'All' | 'Warning' | 'Critical' | 'Monthly Report'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getNotifications' })
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      // Assuming data is an array of notifications
      setNotifications(Array.isArray(data) ? data : (data.notifications || []));
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Could not load notification history.');
      
      // Mock data for demonstration
      setNotifications([
        {
          id: '1',
          timestamp: '2026-03-26T10:30:00Z',
          studentName: 'Jane Smith',
          rollNo: 'CS102',
          attendancePercentage: 65,
          message: 'Dear Parent, Jane Smith\'s attendance is 65%, which is below the 75% threshold. Please ensure regular attendance.',
          type: 'Warning',
          status: 'Delivered'
        },
        {
          id: '2',
          timestamp: '2026-03-26T09:15:00Z',
          studentName: 'Emma Watson',
          rollNo: 'CS106',
          attendancePercentage: 58,
          message: 'CRITICAL ALERT: Emma Watson\'s attendance has dropped to 58%. Immediate action required to avoid academic penalties.',
          type: 'Critical',
          status: 'Delivered'
        },
        {
          id: '3',
          timestamp: '2026-03-25T16:45:00Z',
          studentName: 'Sarah Lee',
          rollNo: 'CS104',
          attendancePercentage: 70,
          message: 'Monthly Attendance Report: Sarah Lee has maintained 70% attendance for the month of March.',
          type: 'Monthly Report',
          status: 'Delivered'
        },
        {
          id: '4',
          timestamp: '2026-03-25T14:20:00Z',
          studentName: 'John Doe',
          rollNo: 'CS101',
          attendancePercentage: 85,
          message: 'Monthly Attendance Report: John Doe has maintained 85% attendance for the month of March.',
          type: 'Monthly Report',
          status: 'Failed'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesType = filterType === 'All' || n.type === filterType;
      const matchesSearch = 
        (n.studentName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
        (n.rollNo?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const notificationDate = new Date(n.timestamp);
      const matchesStartDate = !startDate || notificationDate >= new Date(startDate);
      const matchesEndDate = !endDate || notificationDate <= new Date(endDate + 'T23:59:59');

      return matchesType && matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [notifications, filterType, searchQuery, startDate, endDate]);

  const exportToCSV = () => {
    if (filteredNotifications.length === 0) {
      toast.error('No data to export');
      return;
    }

    const dataToExport = filteredNotifications.map(n => ({
      'Date & Time': new Date(n.timestamp).toLocaleString(),
      'Student Name': n.studentName,
      'Roll No': n.rollNo,
      'Attendance %': `${n.attendancePercentage}%`,
      'Message': n.message,
      'Type': n.type,
      'Status': n.status
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `notifications_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported successfully!');
  };

  const getTypeBadge = (type: Notification['type']) => {
    switch (type) {
      case 'Warning':
        return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><AlertTriangle size={12} /> Warning</span>;
      case 'Critical':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><AlertCircle size={12} /> Critical</span>;
      case 'Monthly Report':
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><FileText size={12} /> Monthly Report</span>;
    }
  };

  const getStatusBadge = (status: Notification['status']) => {
    if (status === 'Delivered') {
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><CheckCircle2 size={12} /> Delivered</span>;
    }
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit"><XCircle size={12} /> Failed</span>;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Notification History</h2>
          <p className="text-slate-500 font-medium">Track and monitor all alerts sent to parents and students.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Download size={20} />
          Export as CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-8 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {(['All', 'Warning', 'Critical', 'Monthly Report'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  filterType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search student or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <CalendarIcon size={18} className="text-slate-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-slate-600"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold text-slate-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Date & Time</th>
                <th className="px-6 py-5">Student</th>
                <th className="px-6 py-5">Roll No</th>
                <th className="px-6 py-5">Attendance</th>
                <th className="px-6 py-5">Message Sent</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                      <span className="text-slate-400 font-bold">Fetching notification history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Inbox size={40} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No alerts sent yet</h3>
                        <p className="text-slate-400 font-medium">Alerts will appear here when students fall below the attendance threshold.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{new Date(n.timestamp).toLocaleDateString()}</span>
                        <span className="text-xs font-medium text-slate-400">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{n.studentName}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{n.rollNo}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        n.attendancePercentage < 60 ? "text-red-600" : "text-amber-600"
                      )}>
                        {n.attendancePercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[240px]">
                      <div 
                        className="text-sm text-slate-500 font-medium truncate cursor-help" 
                        title={n.message}
                      >
                        {n.message.length > 60 ? `${n.message.substring(0, 60)}...` : n.message}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(n.type)}</td>
                    <td className="px-6 py-4">{getStatusBadge(n.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && filteredNotifications.length > 0 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-600 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
