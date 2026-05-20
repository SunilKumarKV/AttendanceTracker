import React, { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, FileText, Loader2, Mail, MessageSquare, Save, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  getNotificationSettings,
  NotificationSettings,
  sendTestNotification,
  updateNotificationSettings,
} from '../api/notifications';
import { ErrorState, Loader } from './common';

const fallbackSettings: NotificationSettings = {
  minimumAttendancePct: 75,
  notificationEnabled: true,
  absentAlertsEnabled: true,
  lowAttendanceAlertsEnabled: true,
  monthlyReportsEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  supportEmail: '',
  smtpConfigured: false,
};

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getNotificationSettings();
      setSettings({ ...fallbackSettings, ...response.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notification settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await updateNotificationSettings(settings);
      setSettings({ ...fallbackSettings, ...response.data });
      toast.success('Notification settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await sendTestNotification({ channel: 'email', recipient: settings.supportEmail || undefined, rule: 'low_attendance_alert' });
      toast.success('Test notification logged.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send test notification.');
    } finally {
      setTesting(false);
    }
  };

  const toggle = (key: keyof NotificationSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  if (loading) return <Loader label="Loading notification settings..." />;
  if (error) return <ErrorState title="Settings unavailable" message={error} onAction={loadSettings} />;

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans">
      <Toaster position="top-right" />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Notification Settings</h2>
        <p className="text-slate-500 font-medium">Configure delivery channels, alert rules, and fallback behavior.</p>
      </div>

      {!settings.smtpConfigured && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-4 text-amber-800">
          <AlertTriangle className="mt-0.5" size={22} />
          <div>
            <p className="font-bold">SMTP is not configured</p>
            <p className="text-sm font-medium">Email delivery will be safely skipped and logged until SMTP_HOST, SMTP_USER, and SMTP_PASS are set.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BellRing size={20} className="text-blue-600" />
            Notification Rules
          </h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 ml-1">Minimum Attendance Threshold</label>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{settings.minimumAttendancePct}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="1"
                value={settings.minimumAttendancePct}
                onChange={(event) => setSettings({ ...settings, minimumAttendancePct: Number(event.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <Toggle icon={<BellRing size={20} />} title="Enable Notifications" description="Master switch for all alert delivery" enabled={settings.notificationEnabled} onClick={() => toggle('notificationEnabled')} />
            <Toggle icon={<AlertTriangle size={20} />} title="Absent Alerts" description="Notify when a student is marked absent" enabled={settings.absentAlertsEnabled} onClick={() => toggle('absentAlertsEnabled')} />
            <Toggle icon={<AlertTriangle size={20} />} title="Low Attendance Alerts" description="Notify when attendance drops below the threshold" enabled={settings.lowAttendanceAlertsEnabled} onClick={() => toggle('lowAttendanceAlertsEnabled')} />
            <Toggle icon={<FileText size={20} />} title="Monthly Report Alerts" description="Send monthly attendance summaries" enabled={settings.monthlyReportsEnabled} onClick={() => toggle('monthlyReportsEnabled')} />
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            Delivery Channels
          </h3>
          <div className="space-y-4">
            <Toggle icon={<Mail size={20} />} title="Email" description="Use Nodemailer SMTP provider" enabled={settings.emailEnabled} onClick={() => toggle('emailEnabled')} />
            <Toggle icon={<MessageSquare size={20} />} title="SMS Placeholder" description="Log SMS attempts until a provider is configured" enabled={settings.smsEnabled} onClick={() => toggle('smsEnabled')} />
            <Toggle icon={<MessageSquare size={20} />} title="WhatsApp Placeholder" description="Log WhatsApp attempts until a provider is configured" enabled={settings.whatsappEnabled} onClick={() => toggle('whatsappEnabled')} />
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}
                placeholder="support@college.edu"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            onClick={sendTest}
            disabled={testing || saving}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-slate-900/10 disabled:opacity-50"
          >
            {testing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            Send Test
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || testing}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-blue-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ icon: React.ReactNode; title: string; description: string; enabled: boolean; onClick: () => void }> = ({ icon, title, description, enabled, onClick }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 gap-4">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 font-medium">{description}</p>
      </div>
    </div>
    <button onClick={onClick} className={`shrink-0 w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);
