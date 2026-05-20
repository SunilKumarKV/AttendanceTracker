import React, { useState, useEffect } from 'react';
import { Building2, GraduationCap, BellRing, Palette, Save, MessageSquare, AlertTriangle, FileText, Moon, Sun, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface AppSettings {
  collegeName: string;
  academicYear: string;
  principalName: string;
  minAttendance: number;
  enableWhatsApp: boolean;
  parentAlerts: boolean;
  monthlyReport: boolean;
  theme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: AppSettings = {
  collegeName: 'AttendanceTracker University',
  academicYear: '2025-26',
  principalName: 'Dr. Sarah Johnson',
  minAttendance: 75,
  enableWhatsApp: true,
  parentAlerts: true,
  monthlyReport: true,
  theme: 'light',
};

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      localStorage.setItem('appSettings', JSON.stringify(settings));
      
      // Apply theme if changed
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      toast.success('Settings saved successfully!', {
        style: {
          background: '#ecfdf5',
          color: '#059669',
          border: '1px solid #d1fae5',
        },
      });
    } catch (err) {
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
        <p className="text-slate-500 font-medium">Configure global application rules and preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Section 1: College Info */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            College Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">College Name</label>
              <input
                type="text"
                value={settings.collegeName}
                onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Academic Year</label>
              <select
                value={settings.academicYear}
                onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
              >
                <option value="2024-25">2024-25</option>
                <option value="2025-26">2025-26</option>
                <option value="2026-27">2026-27</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Principal Name</label>
              <input
                type="text"
                value={settings.principalName}
                onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Attendance Rules */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-600" />
            Attendance Rules
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700 ml-1">Minimum Attendance Threshold</label>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{settings.minAttendance}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="1"
                value={settings.minAttendance}
                onChange={(e) => setSettings({ ...settings, minAttendance: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
                <span>50%</span>
                <span>70%</span>
                <span>90%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: WhatsApp Alerts */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BellRing size={20} className="text-blue-600" />
            WhatsApp Alerts
          </h3>
          
          <div className="space-y-4">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Enable WhatsApp Alerts</p>
                  <p className="text-xs text-slate-500 font-medium">Send real-time updates via WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('enableWhatsApp')}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.enableWhatsApp ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enableWhatsApp ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Parent Alerts (Below 60%)</p>
                  <p className="text-xs text-slate-500 font-medium">Auto-notify parents of low attendance</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('parentAlerts')}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.parentAlerts ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.parentAlerts ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Monthly Professor Report</p>
                  <p className="text-xs text-slate-500 font-medium">Send consolidated reports to faculty</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting('monthlyReport')}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.monthlyReport ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.monthlyReport ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Section 4: Appearance */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Palette size={20} className="text-blue-600" />
            Appearance
          </h3>
          
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                {settings.theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <div>
                <p className="font-bold text-slate-900">Theme Mode</p>
                <p className="text-xs text-slate-500 font-medium">Switch between Light and Dark mode</p>
              </div>
            </div>
            <div className="flex p-1 bg-slate-200 rounded-xl gap-1">
              <button
                onClick={() => setSettings({ ...settings, theme: 'light' })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                Light
              </button>
              <button
                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${settings.theme === 'dark' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                Dark
              </button>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
