import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Camera, Loader2, Lock, Mail, Phone, Save, School, User as UserIcon } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { getProfile, ProfileData, updateProfile, updateProfilePassword } from '../api/profile';
import { useAuth } from '../context/AuthContext';
import { ErrorState, Loader } from './common';

const emptyProfile: ProfileData = {
  id: '',
  institutionId: null,
  name: '',
  email: '',
  role: 'ADMIN',
  phone: '',
  college: '',
  department: '',
  employeeId: '',
  avatar: '',
  preferences: {},
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getProfile();
      setProfile(response.data);
      setAvatarDataUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await updateProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        department: profile.department,
        avatarDataUrl,
        preferences: profile.preferences,
      });
      setProfile(response.data);
      updateCurrentUser({
        id: response.data.id,
        institutionId: response.data.institutionId,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        phone: response.data.phone,
        college: response.data.college,
        department: response.data.department,
        avatar: response.data.avatar,
        employeeId: response.data.employeeId,
      });
      setAvatarDataUrl(null);
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.current && !passwords.new && !passwords.confirm) return;
    if (!passwords.current || !passwords.new) {
      toast.error('Enter current and new password.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    await updateProfilePassword({ currentPassword: passwords.current, newPassword: passwords.new });
    setPasswords({ current: '', new: '', confirm: '' });
    toast.success('Password changed. Please sign in again on other devices.');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveProfile();
      await changePassword();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = reader.result as string;
      setAvatarDataUrl(value);
      setProfile((current) => ({ ...current, avatar: value }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <Loader label="Loading profile..." />;
  if (error) return <ErrorState title="Profile unavailable" message={error} onAction={loadProfile} />;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Toaster position="top-right" />
      <div className="flex items-center gap-4 mb-8">
        <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">My Profile</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-slate-400">
              {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon size={64} />}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            <button type="button" aria-label="Upload profile photo" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 border-2 border-white">
              <Camera size={18} />
            </button>
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700">Change Photo</button>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><UserIcon size={20} className="text-blue-600" /> Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field icon={<UserIcon size={18} />} label="Full Name" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} required />
            <Field icon={<Mail size={18} />} label="Email Address" type="email" value={profile.email} onChange={(value) => setProfile({ ...profile, email: value })} required />
            <Field icon={<Phone size={18} />} label="Phone Number" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} />
            <Field icon={<School size={18} />} label="College Name" value={profile.college} disabled />
            <Field icon={<Building2 size={18} />} label="Department" value={profile.department} onChange={(value) => setProfile({ ...profile, department: value })} />
            {profile.employeeId && <Field icon={<Building2 size={18} />} label="Employee ID" value={profile.employeeId} disabled />}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Lock size={20} className="text-blue-600" /> Security</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PasswordField label="Current Password" value={passwords.current} onChange={(value) => setPasswords({ ...passwords, current: value })} />
            <PasswordField label="New Password" value={passwords.new} onChange={(value) => setPasswords({ ...passwords, new: value })} />
            <PasswordField label="Confirm New Password" value={passwords.confirm} onChange={(value) => setPasswords({ ...passwords, confirm: value })} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

const Field: React.FC<{ icon: React.ReactNode; label: string; value: string; type?: string; disabled?: boolean; required?: boolean; onChange?: (value: string) => void }> = ({ icon, label, value, type = 'text', disabled, required, onChange }) => (
  <div className="space-y-1.5">
    <label htmlFor={`profile-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input id={`profile-${label.toLowerCase().replace(/\s+/g, '-')}`} required={required} disabled={disabled} type={type} value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
    </div>
  </div>
);

const PasswordField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <label htmlFor={`profile-${label.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
    <input id={`profile-${label.toLowerCase().replace(/\s+/g, '-')}`} type="password" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none" />
  </div>
);
