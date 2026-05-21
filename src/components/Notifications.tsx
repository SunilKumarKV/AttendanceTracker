import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Download,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { getNotificationLogs, NotificationFilters, NotificationLog, sendTestNotification } from '../api/notifications';
import { ErrorState } from './common';

const statusOptions = ['All', 'Delivered', 'Skipped', 'Failed'];
const typeOptions = ['All', 'Absent Alert', 'Low Attendance', 'Monthly Report'];
const channelOptions = ['All', 'email', 'sms', 'whatsapp'];

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>({ page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadNotifications = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const response = await getNotificationLogs(nextFilters);
      setNotifications(response.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notification logs.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const updateFilter = (key: keyof NotificationFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value === 'All' || value === '' ? undefined : value, page: 1 }));
  };

  const exportToCSV = async () => {
    if (notifications.length === 0) {
      toast.error('No data to export');
      return;
    }
    const { default: Papa } = await import('papaparse');
    const csv = Papa.unparse(notifications.map((item) => ({
      Date: new Date(item.createdAt).toLocaleString(),
      Channel: item.channel,
      Recipient: item.recipient,
      Subject: item.subject ?? '',
      Type: item.type,
      Student: item.studentName,
      RollNo: item.rollNo,
      Status: item.status,
      Message: item.message,
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notification_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      await sendTestNotification({ channel: 'email', rule: 'low_attendance_alert' });
      toast.success('Test notification logged.');
      await loadNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send test notification.');
    } finally {
      setSendingTest(false);
    }
  };

  const typeBadge = (type: string) => {
    if (type === 'Absent Alert') return <Badge tone="red" icon={<AlertCircle size={12} />} label="Absent Alert" />;
    if (type === 'Monthly Report') return <Badge tone="blue" icon={<FileText size={12} />} label="Monthly Report" />;
    return <Badge tone="amber" icon={<AlertTriangle size={12} />} label="Low Attendance" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'Delivered') return <Badge tone="emerald" icon={<CheckCircle2 size={12} />} label="Delivered" />;
    if (status === 'Skipped') return <Badge tone="slate" icon={<MessageSquare size={12} />} label="Skipped" />;
    return <Badge tone="red" icon={<XCircle size={12} />} label="Failed" />;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Notification Logs</h2>
          <p className="text-slate-500 font-medium">Monitor email, SMS, and WhatsApp delivery attempts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={sendTest} disabled={sendingTest} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
            {sendingTest ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Send Test
          </button>
          <button onClick={() => void exportToCSV()} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-slate-900/10 hover:bg-slate-800">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              aria-label="Search notifications"
              value={filters.search ?? ''}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search recipient, student, roll no..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium"
            />
          </div>
          <Select label="Notification type" value={filters.type ?? 'All'} options={typeOptions} onChange={(value) => updateFilter('type', value)} />
          <Select label="Delivery status" value={filters.status ?? 'All'} options={statusOptions} onChange={(value) => updateFilter('status', value)} />
          <Select label="Delivery channel" value={filters.channel ?? 'All'} options={channelOptions} onChange={(value) => updateFilter('channel', value)} />
          <DateField label="From date" value={filters.fromDate ?? ''} onChange={(value) => updateFilter('fromDate', value)} />
          <DateField label="To date" value={filters.toDate ?? ''} onChange={(value) => updateFilter('toDate', value)} />
          <button onClick={() => void loadNotifications(filters)} disabled={loading} className="md:col-span-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorState title="Notifications unavailable" message={error} onAction={() => void loadNotifications()} /></div>}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Recipient</th>
                <th className="px-6 py-5">Student</th>
                <th className="px-6 py-5">Channel</th>
                <th className="px-6 py-5">Message</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                    <span className="text-slate-400 font-bold">Fetching notification logs...</span>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Inbox className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No notification logs</h3>
                    <p className="text-slate-400 font-medium">Delivery attempts will appear here.</p>
                  </td>
                </tr>
              ) : notifications.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{new Date(item.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400 font-medium">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{item.recipient}</p>
                    <p className="text-xs text-slate-400">{item.providerRef ?? item.provider ?? 'No provider ref'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{item.studentName || 'General'}</p>
                    <p className="text-xs font-mono text-slate-400">{item.rollNo || item.className}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                      <Mail size={12} />
                      {item.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-[280px]">
                    <p title={item.message} className="text-sm text-slate-500 truncate">{item.message}</p>
                  </td>
                  <td className="px-6 py-4">{typeBadge(item.type)}</td>
                  <td className="px-6 py-4">{statusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Select: React.FC<{ label: string; value: string; options: string[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => (
  <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white">
    {options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select>
);

const DateField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="relative">
    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
    <input aria-label={label} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700" />
  </div>
);

const Badge: React.FC<{ tone: 'red' | 'blue' | 'amber' | 'emerald' | 'slate'; icon: React.ReactNode; label: string }> = ({ tone, icon, label }) => {
  const classes = {
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return <span className={`${classes[tone]} px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5`}>{icon}{label}</span>;
};
