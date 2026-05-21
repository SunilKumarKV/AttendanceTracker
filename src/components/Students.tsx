import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  Loader2,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { createStudent, deleteStudent, getStudents, updateStudent } from '../api/admin';
import { ConfirmDialog, EmptyState, ErrorState, Pagination, TableSkeleton } from './common';
import { Student } from '../types';
import { useDebounce } from '../hooks';

const emptyStudent: Student = {
  name: '',
  rollNo: '',
  phone: '',
  parentPhone: '',
  subject: '',
  attendancePercentage: 0,
};

export const Students: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Student>(emptyStudent);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchStudents = async (search = debouncedSearch, nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await getStudents(search, nextPage, pageSize);
      setStudents(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchStudents(debouncedSearch, page);
  }, [debouncedSearch, page]);

  const resetForm = () => {
    setFormData(emptyStudent);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.rollNo.trim()) errors.rollNo = 'Roll No is required';
    const phoneRegex = /^\d{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) errors.phone = 'Phone must be exactly 10 digits';
    if (formData.parentPhone && !phoneRegex.test(formData.parentPhone)) errors.parentPhone = 'Parent phone must be exactly 10 digits';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        rollNo: formData.rollNo.trim(),
        phone: formData.phone.trim(),
        parentPhone: formData.parentPhone.trim(),
        subject: formData.subject?.trim(),
      };
      if (isEditModalOpen && selectedStudent?.id) {
        await updateStudent(selectedStudent.id, payload);
        toast.success('Student updated successfully!');
      } else {
        await createStudent(payload);
        toast.success('Student added successfully!');
      }
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      resetForm();
      await fetchStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent?.id) return;
    setIsSubmitting(true);
    try {
      await deleteStudent(selectedStudent.id);
      toast.success('Student deleted successfully!');
      setSelectedStudent(null);
      await fetchStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateImportRow = (row: any, index: number) => {
    const required = ['Name', 'Roll No'];
    const missing = required.filter(col => !row[col] && row[col] !== 0);
    if (missing.length > 0) throw new Error(`Row ${index + 1} is missing columns: ${missing.join(', ')}`);
    return {
      name: String(row.Name).trim(),
      rollNo: String(row['Roll No']).trim(),
      phone: String(row.Phone ?? '').trim(),
      parentPhone: String(row['Parent Phone'] ?? '').trim(),
      subject: String(row.Subject ?? '').trim(),
      attendancePercentage: 0,
    };
  };

  const parseFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      void import('papaparse').then(({ default: Papa }) => Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            setPreviewData((results.data as any[]).filter(row => !Object.values(row).every(v => !v)).map(validateImportRow));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error parsing CSV file.');
          }
        },
        error: () => toast.error('Error parsing CSV file.'),
      }));
      return;
    }
    if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          setPreviewData((XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[]).filter(row => !Object.values(row).every(v => !v)).map(validateImportRow));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Error parsing Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    toast.error('Please upload a valid .csv or .xlsx file');
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    for (const student of previewData) {
      try {
        await createStudent(student);
        successCount++;
      } catch {
        failCount++;
      }
    }
    toast.success(`${successCount} students imported successfully, ${failCount} rows failed/skipped`);
    setPreviewData([]);
    setActiveTab('list');
    setIsImporting(false);
    await fetchStudents();
  };

  const downloadSampleCSV = () => {
    const csvContent = [
      ['Name', 'Roll No', 'Phone', 'Parent Phone', 'Subject'],
      ['John Doe', 'CS101', '9876543210', '9876543211', 'Computer Science'],
    ].map(row => row.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'sample_students.csv';
    link.click();
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 75) return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Safe</span>;
    if (percentage >= 60) return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Warning</span>;
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Critical</span>;
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Student Management</h2>
          <p className="text-slate-500 font-medium">Manage your student database and attendance records.</p>
        </div>
        <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} aria-label="Add student" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">
          <UserPlus size={20} />
          Add Student
        </button>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8">
        <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users size={18} /> Student List
        </button>
        <button onClick={() => setActiveTab('upload')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Upload size={18} /> Upload CSV
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" aria-label="Search students" placeholder="Search by name or roll number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-medium" />
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total: {total} Students</div>
          </div>
          {error ? (
            <div className="p-6"><ErrorState title="Could not load students" message={error} onAction={() => void fetchStudents()} /></div>
          ) : loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : students.length === 0 ? (
            <div className="p-6"><EmptyState title="No students found" message="Try a different search or add/import students to start building the roster." actionLabel="Add Student" onAction={() => { resetForm(); setIsAddModalOpen(true); }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Name</th><th className="px-6 py-4">Roll No</th><th className="px-6 py-4">Phone</th><th className="px-6 py-4">Attendance %</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id ?? student.rollNo} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{student.phone}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{student.attendancePercentage || 0}%</td>
                      <td className="px-6 py-4">{getStatusBadge(student.attendancePercentage || 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setSelectedStudent(student); setFormData(student); setFormErrors({}); setIsEditModalOpen(true); }} aria-label={`Edit ${student.name}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                          <button onClick={() => setSelectedStudent(student)} aria-label={`Delete ${student.name}`} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && students.length > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-all group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) parseFile(file); }} />
            <Upload size={32} className="text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Student Data</h3>
            <p className="text-slate-500 mb-6 max-w-xs">Drag and drop your .csv or .xlsx file here, or click to browse.</p>
            <button onClick={(e) => { e.stopPropagation(); downloadSampleCSV(); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
              <Download size={18} /> Download Sample CSV
            </button>
          </div>
          {previewData.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Import Preview</h3>
                <button onClick={handleConfirmImport} disabled={isImporting} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50">
                  {isImporting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Confirm Import
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900">{isAddModalOpen ? 'Add New Student' : 'Edit Student Details'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setSelectedStudent(null); resetForm(); }} aria-label="Close student form" className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={saveStudent} className="p-8 space-y-6">
              <StudentField label="Full Name" value={formData.name} error={formErrors.name} onChange={(name) => setFormData({ ...formData, name })} />
              <StudentField label="Roll Number" value={formData.rollNo} error={formErrors.rollNo} disabled={isEditModalOpen} onChange={(rollNo) => setFormData({ ...formData, rollNo })} />
              <StudentField label="Subject" value={formData.subject ?? ''} onChange={(subject) => setFormData({ ...formData, subject })} />
              <StudentField label="Student Phone" value={formData.phone} error={formErrors.phone} onChange={(phone) => setFormData({ ...formData, phone })} />
              <StudentField label="Parent Phone" value={formData.parentPhone} error={formErrors.parentPhone} onChange={(parentPhone) => setFormData({ ...formData, parentPhone })} />
              <div className="flex gap-4 pt-4">
                <button type="button" disabled={isSubmitting} onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setSelectedStudent(null); resetForm(); }} className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                  {isAddModalOpen ? 'Add Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(selectedStudent && !isEditModalOpen)}
        title="Delete Student?"
        message={`Are you sure you want to delete ${selectedStudent?.name ?? 'this student'}?`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setSelectedStudent(null)}
        onConfirm={handleDeleteStudent}
      />
    </div>
  );
};

const StudentField: React.FC<{
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, error, disabled, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
    <input
      required={label !== 'Subject'}
      disabled={disabled}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
      aria-label={label}
    />
    {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
  </div>
);
