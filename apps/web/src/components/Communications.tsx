import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Edit3, ExternalLink, Loader2, Mail, MessageCircle, RefreshCcw, Save, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  CommunicationTemplate,
  getCommunicationTemplates,
  getLowAttendanceStudents,
  LowAttendanceStudent,
  sendStudentAlert,
  updateCommunicationTemplate,
} from '../api/notifications';
import { ErrorState } from './common';

const severityClass = (severity: string) => {
  if (severity === 'SEVERE') return 'bg-red-100 text-red-700 border-red-200';
  if (severity === 'CRITICAL') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
};

export const Communications: React.FC = () => {
  const [students, setStudents] = useState<LowAttendanceStudent[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studentResponse, templateResponse] = await Promise.all([
        getLowAttendanceStudents(),
        getCommunicationTemplates(),
      ]);
      setStudents(studentResponse.data);
      setTemplates(templateResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load communication dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendAlert = async (student: LowAttendanceStudent, channel: 'email' | 'whatsapp', type: 'low_attendance_alert' | 'monthly_report_alert') => {
    const key = `${student.id}-${channel}-${type}`;
    setSendingKey(key);
    try {
      const response = await sendStudentAlert({
        studentId: student.id,
        channel,
        type,
        recipientType: 'parent',
        manual: channel === 'whatsapp',
      });
      if (channel === 'whatsapp' && response.data.whatsappLink) {
        window.open(response.data.whatsappLink, '_blank', 'noopener,noreferrer');
        toast.success('WhatsApp message generated and alert history saved.');
      } else {
        toast.success('Email alert processed and saved to alert history.');
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send alert.');
    } finally {
      setSendingKey(null);
    }
  };

  const updateTemplate = (id: string, patch: Partial<CommunicationTemplate>) => {
    setTemplates((current) => current.map((template) => template.id === id ? { ...template, ...patch } : template));
  };

  const saveTemplate = async (template: CommunicationTemplate) => {
    setSavingId(template.id);
    try {
      const response = await updateCommunicationTemplate(template.id, {
        name: template.name,
        subject: template.subject ?? '',
        body: template.body,
        isActive: template.isActive,
      });
      setTemplates((current) => current.map((item) => item.id === template.id ? response.data : item));
      toast.success('Template saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save template.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-8 pb-12">
      <Toaster position="top-right" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Version 1.3</p>
          <h1 className="text-3xl font-black text-slate-900">Communication Dashboard</h1>
          <p className="mt-2 max-w-3xl text-slate-500">Send low-attendance emails, generate WhatsApp click-to-send links, manage message templates, and track alert history.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800">
          <RefreshCcw size={18} /> Refresh
        </button>
      </div>

      {error && <ErrorState title="Communication dashboard unavailable" message={error} onAction={() => void load()} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard title="Below 75%" value={students.length} tone="amber" />
        <SummaryCard title="Below 65%" value={students.filter((student) => student.attendancePercentage <= 65).length} tone="orange" />
        <SummaryCard title="Below 50%" value={students.filter((student) => student.attendancePercentage <= 50).length} tone="red" />
        <SummaryCard title="Templates" value={templates.length} tone="blue" />
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-xl font-black text-slate-900">Low attendance students</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">Manual send first: email is sent through SMTP; WhatsApp opens a click-to-send link and stores manual alert history.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4">Parent contact</th>
                <th className="px-6 py-4">Last alert</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center font-bold text-slate-400">No low-attendance students found.</td></tr>
              ) : students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900">{student.name}</p>
                    <p className="text-xs font-mono text-slate-400">{student.rollNumber}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{student.className} / {student.sectionName}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${severityClass(student.severity)}`}>
                      <AlertTriangle size={14} /> {student.attendancePercentage}% · {student.severity}
                    </span>
                    <p className="mt-1 text-xs text-slate-400">{student.attendedClasses}/{student.totalClasses} classes</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <p>{student.parentEmail || student.email || 'No email'}</p>
                    <p>{student.parentPhone || student.phone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{student.lastAlertStatus}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void sendAlert(student, 'email', 'low_attendance_alert')} disabled={sendingKey === `${student.id}-email-low_attendance_alert`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        <Mail size={14} /> Email
                      </button>
                      <button onClick={() => void sendAlert(student, 'whatsapp', 'low_attendance_alert')} disabled={sendingKey === `${student.id}-whatsapp-low_attendance_alert`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                      <button onClick={() => void sendAlert(student, 'email', 'monthly_report_alert')} disabled={sendingKey === `${student.id}-email-monthly_report_alert`} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        <Send size={14} /> Monthly
                      </button>
                      {student.whatsappLink && <a href={student.whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><ExternalLink size={14} /> Preview</a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Edit3 className="text-blue-600" />
          <div>
            <h2 className="text-xl font-black text-slate-900">Editable message templates</h2>
            <p className="text-sm text-slate-500">Available variables: {'{{studentName}}'}, {'{{rollNumber}}'}, {'{{className}}'}, {'{{sectionName}}'}, {'{{attendancePercentage}}'}, {'{{attendedClasses}}'}, {'{{totalClasses}}'}, {'{{threshold}}'}, {'{{severity}}'}.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{template.channel} · {template.key}</p>
                  <input value={template.name} onChange={(event) => updateTemplate(template.id, { name: event.target.value })} className="mt-1 w-full bg-transparent text-base font-black text-slate-900 outline-none" />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" checked={template.isActive} onChange={(event) => updateTemplate(template.id, { isActive: event.target.checked })} /> Active</label>
              </div>
              {template.channel === 'email' && <input value={template.subject ?? ''} onChange={(event) => updateTemplate(template.id, { subject: event.target.value })} placeholder="Email subject" className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-blue-500" />}
              <textarea value={template.body} onChange={(event) => updateTemplate(template.id, { body: event.target.value })} rows={5} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500" />
              <button onClick={() => void saveTemplate(template)} disabled={savingId === template.id} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {savingId === template.id ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Template
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: number; tone: 'amber' | 'orange' | 'red' | 'blue' }> = ({ title, value, tone }) => {
  const colors = {
    amber: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return <div className={`rounded-3xl border border-slate-100 p-5 shadow-sm ${colors[tone]}`}><p className="text-xs font-black uppercase tracking-widest opacity-70">{title}</p><p className="mt-2 text-3xl font-black">{value}</p><CheckCircle2 className="mt-3 opacity-40" /></div>;
};
