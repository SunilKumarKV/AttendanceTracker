import React, { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  X,
  Mail,
  User as UserIcon,
  Phone,
  BookOpen,
  Building2,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  Teacher,
  updateTeacher,
} from '../api/admin';
import { ConfirmDialog, EmptyState, ErrorState } from './common';
import { Pagination, TableSkeleton } from './common';
import { useDebounce } from '../hooks';

const emptyForm = {
  name: '',
  email: '',
  employeeId: '',
  subject: '',
  phone: '',
  department: '',
  password: '',
  isActive: 'true',
};

export const ManageTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchTeachers = useCallback(async (search = debouncedSearch, nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await getTeachers(search, nextPage, pageSize);
      setTeachers(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teachers.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchTeachers(debouncedSearch, page);
  }, [debouncedSearch, fetchTeachers, page]);

  const handleOpenModal = (prof: Teacher | null = null) => {
    setEditingTeacher(prof);
    setFormData(prof ? {
      name: prof.name,
      email: prof.email,
      employeeId: prof.employeeId || '',
      subject: prof.subject || '',
      phone: prof.phone || '',
      department: prof.department || '',
      password: '',
      isActive: prof.status === 'Inactive' ? 'false' : 'true',
    } : emptyForm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTeacher) {
        await updateTeacher(editingTeacher.id!, { ...formData, isActive: formData.isActive !== 'false' });
        toast.success('Teacher updated successfully');
      } else {
        await createTeacher({ ...formData, isActive: formData.isActive !== 'false' });
        toast.success('Teacher added successfully');
      }
      handleCloseModal();
      await fetchTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save teacher.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTeacher) return;
    setSaving(true);
    try {
      await deleteTeacher(deletingTeacher.id!);
      toast.success('Teacher removed');
      setDeletingTeacher(null);
      await fetchTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete teacher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            aria-label="Search teachers"
            placeholder="Search by name, ID or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <UserPlus size={20} />
          <span>Add Teacher</span>
        </button>
      </div>

      {error ? (
        <ErrorState title="Could not load teachers" message={error} onAction={() => void fetchTeachers()} />
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900"><TableSkeleton rows={6} columns={5} /></div>
      ) : teachers.length === 0 ? (
        <EmptyState title="No teachers found" message="Try a different search or add a teacher to start assigning subjects." actionLabel="Add Teacher" onAction={() => handleOpenModal()} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assignments</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                          {prof.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{prof.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={12} />
                            {prof.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {prof.employeeId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{prof.subject || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{prof.department || '-'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{prof.assignedCount ?? 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        prof.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prof.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {prof.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(prof)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Teacher" aria-label={`Edit ${prof.name}`}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setDeletingTeacher(prof)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Teacher" aria-label={`Delete ${prof.name}`}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close modal" onClick={handleCloseModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  {editingTeacher ? <Edit2 className="text-white w-5 h-5" /> : <UserPlus className="text-white w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{editingTeacher ? 'Update existing faculty details' : 'Register a new faculty member'}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} aria-label="Close teacher form" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field icon={<UserIcon size={14} />} label="Full Name" value={formData.name} onChange={(name) => setFormData({ ...formData, name })} required />
                <Field icon={<Mail size={14} />} label="Email Address" value={formData.email} onChange={(email) => setFormData({ ...formData, email })} type="email" required />
                <Field icon={<ShieldCheck size={14} />} label="Employee ID" value={formData.employeeId} onChange={(employeeId) => setFormData({ ...formData, employeeId })} required />
                <Field icon={<BookOpen size={14} />} label="Subject" value={formData.subject} onChange={(subject) => setFormData({ ...formData, subject })} />
                <Field icon={<Phone size={14} />} label="Phone Number" value={formData.phone} onChange={(phone) => setFormData({ ...formData, phone })} />
                <Field icon={<Building2 size={14} />} label="Department" value={formData.department} onChange={(department) => setFormData({ ...formData, department })} />
                {!editingTeacher && (
                  <PasswordField value={formData.password} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={(password) => setFormData({ ...formData, password })} />
                )}
                <SelectField label="Status" value={formData.isActive} onChange={(isActive) => setFormData({ ...formData, isActive })} />
              </div>
              {editingTeacher && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                  Reset password is intentionally handled through the secure change/forgot password flow. Create-time password is available only when registering a new teacher.
                </div>
              )}
              <div className="mt-8 flex items-center justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                  {editingTeacher ? 'Save Changes' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingTeacher)}
        title="Remove Teacher?"
        message={`Are you sure you want to remove ${deletingTeacher?.name ?? 'this teacher'}?`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeletingTeacher(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}> = ({ label, value, icon, onChange, type = 'text', required }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
      <span className="text-blue-500">{icon}</span>
      {label}
    </label>
    <input
      required={required}
      type={type}
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    />
  </div>
);

const PasswordField: React.FC<{
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}> = ({ value, show, onToggle, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
      <span className="text-blue-500"><ShieldCheck size={14} /></span>
      Password
    </label>
    <div className="relative">
      <input
        required
        type={show ? 'text' : 'password'}
        className="w-full px-4 py-2.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Password"
      />
      <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const SelectField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700">{label}</label>
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium">
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  </div>
);

export const ManageProfessors = ManageTeachers;
