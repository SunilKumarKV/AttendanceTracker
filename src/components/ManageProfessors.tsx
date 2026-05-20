import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createProfessor,
  deleteProfessor,
  getProfessors,
  Professor,
  updateProfessor,
} from '../api/admin';
import { ConfirmDialog, EmptyState, ErrorState, Loader } from './common';
import { Pagination, TableSkeleton } from './common';
import { useDebounce } from '../hooks';

const emptyForm = {
  name: '',
  email: '',
  employeeId: '',
  subject: '',
  phone: '',
  department: '',
};

export const ManageProfessors: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [deletingProfessor, setDeletingProfessor] = useState<Professor | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchProfessors = async (search = debouncedSearch, nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await getProfessors(search, nextPage, pageSize);
      setProfessors(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load professors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchProfessors(debouncedSearch, page);
  }, [debouncedSearch, page]);

  const handleOpenModal = (prof: Professor | null = null) => {
    setEditingProfessor(prof);
    setFormData(prof ? {
      name: prof.name,
      email: prof.email,
      employeeId: prof.employeeId || '',
      subject: prof.subject || '',
      phone: prof.phone || '',
      department: prof.department || '',
    } : emptyForm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProfessor(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProfessor) {
        await updateProfessor(editingProfessor.id!, formData);
        toast.success('Professor updated successfully');
      } else {
        await createProfessor(formData);
        toast.success('Professor added successfully');
      }
      handleCloseModal();
      await fetchProfessors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save professor.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProfessor) return;
    setSaving(true);
    try {
      await deleteProfessor(deletingProfessor.id!);
      toast.success('Professor removed');
      setDeletingProfessor(null);
      await fetchProfessors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete professor.');
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
            aria-label="Search professors"
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
          <span>Add Professor</span>
        </button>
      </div>

      {error ? (
        <ErrorState title="Could not load professors" message={error} onAction={() => void fetchProfessors()} />
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900"><TableSkeleton rows={6} columns={5} /></div>
      ) : professors.length === 0 ? (
        <EmptyState title="No professors found" message="Try a different search or add a professor to start assigning subjects." actionLabel="Add Professor" onAction={() => handleOpenModal()} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Professor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {professors.map((prof) => (
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
                        <button onClick={() => handleOpenModal(prof)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Professor" aria-label={`Edit ${prof.name}`}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setDeletingProfessor(prof)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Professor" aria-label={`Delete ${prof.name}`}>
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
                  {editingProfessor ? <Edit2 className="text-white w-5 h-5" /> : <UserPlus className="text-white w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{editingProfessor ? 'Edit Professor' : 'Add New Professor'}</h3>
                  <p className="text-xs text-slate-500 font-medium">{editingProfessor ? 'Update existing faculty details' : 'Register a new faculty member'}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} aria-label="Close professor form" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
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
              </div>
              <div className="mt-8 flex items-center justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : null}
                  {editingProfessor ? 'Save Changes' : 'Register Professor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingProfessor)}
        title="Remove Professor?"
        message={`Are you sure you want to remove ${deletingProfessor?.name ?? 'this professor'}?`}
        confirmLabel="Remove"
        destructive
        onCancel={() => setDeletingProfessor(null)}
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
