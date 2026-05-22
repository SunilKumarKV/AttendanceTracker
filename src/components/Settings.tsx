import React, { useEffect, useState } from 'react';
import { AlertTriangle, BellRing, Building2, FileText, Loader2, Mail, MessageSquare, Moon, Save, Send, Sun } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { AppSettingsData, getAppSettings, updateAppSettings } from '../api/settings';
import {
  getNotificationSettings,
  NotificationSettings,
  sendTestNotification,
  updateNotificationSettings,
} from '../api/notifications';
import { ErrorState, Loader } from './common';

const fallbackSettings: NotificationSettings = {
  minimumAttendancePct: 75,
  warningAttendancePct: 75,
  criticalAttendancePct: 55,
  severeAttendancePct: 45,
  notificationEnabled: true,
  absentAlertsEnabled: true,
  lowAttendanceAlertsEnabled: true,
  monthlyReportsEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  alertTimingPreference: '08:00',
  supportEmail: '',
  smtpConfigured: false,
};

const fallbackAppSettings: AppSettingsData = {
  institution: {
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
  },
  academicYear: '2025-26',
  principalName: '',
  theme: 'light',
  attendanceLockAfterSubmit: false,
  timezone: 'Asia/Kolkata',
  minimumAttendancePct: 75,
  notificationEnabled: true,
};

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>(fallbackSettings);
  const [appSettings, setAppSettings] = useState<AppSettingsData>(fallbackAppSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const [appResponse, notificationResponse] = await Promise.all([
        getAppSettings(),
        getNotificationSettings(),
      ]);
      setAppSettings({ ...fallbackAppSettings, ...appResponse.data });
      setSettings({ ...fallbackSettings, ...notificationResponse.data });
      localStorage.setItem('attendance_tracker_theme', appResponse.data.theme);
      document.documentElement.classList.toggle('dark', appResponse.data.theme === 'dark');
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
      const [appResponse, notificationResponse] = await Promise.all([
        updateAppSettings(appSettings),
        updateNotificationSettings(settings),
      ]);
      setAppSettings({ ...fallbackAppSettings, ...appResponse.data });
      setSettings({ ...fallbackSettings, ...notificationResponse.data });
      localStorage.setItem('attendance_tracker_theme', appResponse.data.theme);
      document.documentElement.classList.toggle('dark', appResponse.data.theme === 'dark');
      toast.success('Settings saved.');
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
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500 font-medium">Configure institution details, preferences, and notification delivery.</p>
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
            <Building2 size={20} className="text-blue-600" />
            Institution Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TextField label="Institution Name" value={appSettings.institution.name} onChange={(value) => setAppSettings({ ...appSettings, institution: { ...appSettings.institution, name: value } })} />
            <TextField label="Institution Email" type="email" value={appSettings.institution.email} onChange={(value) => setAppSettings({ ...appSettings, institution: { ...appSettings.institution, email: value } })} />
            <TextField label="Phone" value={appSettings.institution.phone} onChange={(value) => setAppSettings({ ...appSettings, institution: { ...appSettings.institution, phone: value } })} />
            <TextField label="Academic Year" value={appSettings.academicYear} onChange={(value) => setAppSettings({ ...appSettings, academicYear: value })} />
            <TextField label="Principal Name" value={appSettings.principalName} onChange={(value) => setAppSettings({ ...appSettings, principalName: value })} />
            <TextField label="Timezone" value={appSettings.timezone} onChange={(value) => setAppSettings({ ...appSettings, timezone: value })} />
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="institution-address" className="text-sm font-semibold text-slate-700 ml-1">Address</label>
              <textarea
                id="institution-address"
                value={appSettings.institution.address}
                onChange={(event) => setAppSettings({ ...appSettings, institution: { ...appSettings.institution, address: event.target.value } })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none min-h-24"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            Attendance Rules
          </h3>
          <Toggle
            icon={<FileText size={20} />}
            title="Lock Attendance After Submit"
            description="When enabled, teacher submissions are locked immediately and cannot be edited."
            enabled={appSettings.attendanceLockAfterSubmit}
            onClick={() => setAppSettings({ ...appSettings, attendanceLockAfterSubmit: !appSettings.attendanceLockAfterSubmit })}
          />
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            {appSettings.theme === 'light' ? <Sun size={20} className="text-blue-600" /> : <Moon size={20} className="text-blue-600" />}
            User Preferences
          </h3>
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 w-fit">
            <button
              type="button"
              onClick={() => setAppSettings({ ...appSettings, theme: 'light' })}
              className={`px-5 py-2 rounded-lg text-sm font-bold ${appSettings.theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setAppSettings({ ...appSettings, theme: 'dark' })}
              className={`px-5 py-2 rounded-lg text-sm font-bold ${appSettings.theme === 'dark' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Dark
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BellRing size={20} className="text-blue-600" />
            Notification Rules
          </h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label htmlFor="minimum-attendance-threshold" className="text-sm font-semibold text-slate-700 ml-1">Minimum Attendance Threshold</label>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{settings.minimumAttendancePct}%</span>
              </div>
              <input
                type="range"
                id="minimum-attendance-threshold"
                min="50"
                max="90"
                step="1"
                value={settings.warningAttendancePct}
                onChange={(event) => setSettings({ ...settings, minimumAttendancePct: Number(event.target.value), warningAttendancePct: Number(event.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <Toggle icon={<BellRing size={20} />} title="Enable Notifications" description="Master switch for all alert delivery" enabled={settings.notificationEnabled} onClick={() => toggle('notificationEnabled')} />
            <Toggle icon={<AlertTriangle size={20} />} title="Absent Alerts" description="Notify when a student is marked absent" enabled={settings.absentAlertsEnabled} onClick={() => toggle('absentAlertsEnabled')} />
            <Toggle icon={<AlertTriangle size={20} />} title="Low Attendance Alerts" description="Notify when attendance drops below the threshold" enabled={settings.lowAttendanceAlertsEnabled} onClick={() => toggle('lowAttendanceAlertsEnabled')} />
            <Toggle icon={<FileText size={20} />} title="Monthly Report Alerts" description="Send monthly attendance summaries" enabled={settings.monthlyReportsEnabled} onClick={() => toggle('monthlyReportsEnabled')} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField label="Warning %" value={settings.warningAttendancePct} onChange={(value) => setSettings({ ...settings, warningAttendancePct: value, minimumAttendancePct: value })} />
              <NumberField label="Critical %" value={settings.criticalAttendancePct} onChange={(value) => setSettings({ ...settings, criticalAttendancePct: value })} />
              <NumberField label="Severe %" value={settings.severeAttendancePct} onChange={(value) => setSettings({ ...settings, severeAttendancePct: value })} />
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 font-medium">
              Rule flow: below Warning sends student/guardian WhatsApp, below Critical adds parent SMS, below Severe adds HOD/Admin email escalation.
            </div>
            <TextField label="Alert Timing Preference" value={settings.alertTimingPreference} onChange={(value) => setSettings({ ...settings, alertTimingPreference: value })} />
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Mail size={20} className="text-blue-600" />
            Delivery Channels
          </h3>
          <div className="space-y-4">
            <Toggle icon={<Mail size={20} />} title="Email" description="Use Nodemailer SMTP provider" enabled={settings.emailEnabled} onClick={() => toggle('emailEnabled')} />
            <Toggle icon={<MessageSquare size={20} />} title="SMS / Parent escalation" description="Uses Twilio when configured; otherwise logs skipped attempts safely" enabled={settings.smsEnabled} onClick={() => toggle('smsEnabled')} />
            <Toggle icon={<MessageSquare size={20} />} title="WhatsApp alerts" description="Uses Meta Cloud API or Twilio WhatsApp when configured" enabled={settings.whatsappEnabled} onClick={() => toggle('whatsappEnabled')} />
            <div className="space-y-1.5">
              <label htmlFor="support-email" className="text-sm font-semibold text-slate-700 ml-1">Support Email</label>
              <input
                id="support-email"
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
    <button type="button" onClick={onClick} aria-label={`${enabled ? 'Disable' : 'Enable'} ${title}`} className={`shrink-0 w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

const TextField: React.FC<{ label: string; value: string; type?: string; onChange: (value: string) => void }> = ({ label, value, type = 'text', onChange }) => (
  <div className="space-y-1.5">
    <label htmlFor={`setting-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
    <input
      id={`setting-${label.toLowerCase().replace(/\s+/g, '-')}`}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
    />
  </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (value: number) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label htmlFor={`setting-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
    <input
      id={`setting-${label.toLowerCase().replace(/\s+/g, '-')}`}
      type="number"
      min={0}
      max={100}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
    />
  </div>
);
