import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { Course, getAcademicResource, Section, Semester, createStudent, deleteStudent, getStudents, importStudentsFile, StudentImportResult, updateStudent } from '../api/admin';
import { ConfirmDialog, EmptyState, ErrorState, Pagination, TableSkeleton } from './common';
import { Student } from '../types';
import { useNavigate } from 'react-router-dom';
import { isPaymentRequiredError } from '../api/client';
import { useDebounce } from '../hooks';

const emptyStudent: Student = {
  name: '',
  rollNo: '',
  phone: '',
  parentPhone: '',
  email: '',
  courseId: '',
  semesterId: '',
  sectionId: '',
  isActive: true,
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
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Student>(emptyStudent);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();

  const showBillingError = (err: unknown, fallback: string) => {
    if (isPaymentRequiredError(err)) {
      toast.error(err instanceof Error ? err.message : fallback, {
        action: {
          label: 'Go to Billing',
          onClick: () => navigate('/billing'),
        },
      });
      return;
    }

    toast.error(err instanceof Error ? err.message : fallback);
  };
  const navigate = useNavigate();

  const fetchStudents = useCallback(async (search = debouncedSearch, nextPage = page) => {
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
  }, [debouncedSearch, page]);

  const loadAcademicReferences = useCallback(async () => {
    const [courseResponse, semesterResponse, sectionResponse] = await Promise.all([
      getAcademicResource<Course>('classes', { pageSize: 100 }),
      getAcademicResource<Semester>('semesters', { pageSize: 100 }),
      getAcademicResource<Section>('sections', { pageSize: 100 }),
    ]);
    setCourses(courseResponse.data.items.filter((course) => course.isActive !== false));
    setSemesters(semesterResponse.data.items.filter((semester) => semester.isActive !== false));
    setSections(sectionResponse.data.items.filter((section) => section.isActive !== false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchStudents(debouncedSearch, page);
  }, [debouncedSearch, fetchStudents, page]);

  useEffect(() => {
    void loadAcademicReferences();
  }, [loadAcademicReferences]);

  const resetForm = () => {
    setFormData(emptyStudent);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.rollNo.trim()) errors.rollNo = 'Roll No is required';
    if (!formData.courseId) errors.courseId = 'Class is required';
    if (!formData.semesterId) errors.semesterId = 'Semester is required';
    if (!formData.sectionId) errors.sectionId = 'Section is required';
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
        email: formData.email?.trim(),
        courseId: formData.courseId,
        semesterId: formData.semesterId,
        sectionId: formData.sectionId,
        isActive: formData.isActive,
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
      showBillingError(err, 'Could not save student.');
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

  const validateImportFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xlsx'].includes(extension)) {
      toast.error('Please upload a valid .csv or .xlsx file.');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be 2 MB or less.');
      return false;
    }
    return true;
  };

  const handleFileSelected = (file: File) => {
    if (!validateImportFile(file)) return;
    setSelectedImportFile(file);
    setImportResult(null);
  };

  const handleConfirmImport = async () => {
    if (!selectedImportFile) {
      toast.error('Please select a CSV or XLSX file first.');
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const response = await importStudentsFile(selectedImportFile);
      setImportResult(response.data);
      if (response.data.importedCount > 0) {
        toast.success(`${response.data.importedCount} students imported successfully.`);
        await fetchStudents();
      }
      if (response.data.failedCount > 0) {
        toast.error(`${response.data.failedCount} rows failed validation. Review the row errors below.`);
      }
      if (response.data.failedCount === 0) {
        setSelectedImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      showBillingError(err, 'Could not import students.');
    } finally {
      setIsImporting(false);
    }
  };

  const sampleStudentRows = () => ([
    ['name', 'rollNumber', 'email', 'mobile', 'className', 'sectionName', 'parentName', 'parentEmail', 'parentMobile'],
    ['John Doe', 'CS101', 'john@example.com', '9876543210', courses[0]?.name ?? 'CLASS-NAME', sections[0]?.name ?? 'SECTION-NAME', 'Parent Doe', 'parent@example.com', '9876543211'],
  ]);

  const downloadSampleCSV = () => {
    const csvContent = sampleStudentRows()
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'sample_students.csv';
    link.click();
  };

  const downloadSampleXLSX = () => {
    const byteCharacters = atob('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');
    const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sample_students.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 75) return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Safe</span>;
    if (percentage >= 60) return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Warning</span>;
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Critical</span>;
  };

  const semesterOptions = semesters.filter((semester) => semester.courseId === formData.courseId);
  const sectionOptions = sections.filter((section) => section.courseId === formData.courseId && (!formData.semesterId || section.semesterId === formData.semesterId));

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
          <Upload size={18} /> Upload CSV/XLSX
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
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelected(file); }} />
            <Upload size={32} className="text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Student Data</h3>
            <p className="text-slate-500 mb-6 max-w-xs">Upload a .csv or .xlsx file with name, rollNumber, email, mobile, className, and sectionName.</p>
            <button onClick={(e) => { e.stopPropagation(); downloadSampleCSV(); }} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all">
              <Download size={18} /> Download Sample CSV
            </button>
            <button onClick={(e) => { e.stopPropagation(); void downloadSampleXLSX(); }} className="mt-3 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
              <Download size={18} /> Download Sample XLSX
            </button>
            {selectedImportFile && <p className="mt-4 text-sm font-bold text-slate-700">Selected: {selectedImportFile.name}</p>}
          </div>
          {selectedImportFile && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">Ready to Import</h3>
                <button onClick={handleConfirmImport} disabled={isImporting} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50">
                  {isImporting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Import Students
                </button>
              </div>
              {importResult && (
                <div className="p-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ImportStat label="Total rows" value={importResult.totalRows} />
                    <ImportStat label="Imported" value={importResult.importedCount} />
                    <ImportStat label="Failed" value={importResult.failedCount} />
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <h4 className="mb-3 font-bold text-red-700">Row-wise errors</h4>
                      <div className="max-h-72 space-y-2 overflow-y-auto text-sm text-red-700">
                        {importResult.errors.map((item) => (
                          <div key={item.row} className="rounded-xl bg-white p-3 shadow-sm">
                            <strong>Row {item.row}:</strong> {item.errors.join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900">{isAddModalOpen ? 'Add New Student' : 'Edit Student Details'}</h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setSelectedStudent(null); resetForm(); }} aria-label="Close student form" className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={saveStudent} className="space-y-6 overflow-y-auto p-8">
              <StudentField label="Full Name" value={formData.name} error={formErrors.name} onChange={(name) => setFormData({ ...formData, name })} />
              <StudentField label="Email" value={formData.email ?? ''} onChange={(email) => setFormData({ ...formData, email })} required={false} />
              <StudentField label="Roll Number" value={formData.rollNo} error={formErrors.rollNo} disabled={isEditModalOpen} onChange={(rollNo) => setFormData({ ...formData, rollNo })} />
              <SelectField label="Class" value={formData.courseId ?? ''} error={formErrors.courseId} options={courses.map((course) => ({ value: course.id, label: `${course.name} (${course.code})` }))} onChange={(courseId) => setFormData({ ...formData, courseId, semesterId: '', sectionId: '' })} />
              <SelectField label="Semester" value={formData.semesterId ?? ''} error={formErrors.semesterId} options={semesterOptions.map((semester) => ({ value: semester.id, label: semester.name }))} onChange={(semesterId) => setFormData({ ...formData, semesterId, sectionId: '' })} />
              <SelectField label="Section" value={formData.sectionId ?? ''} error={formErrors.sectionId} options={sectionOptions.map((section) => ({ value: section.id, label: `${section.name}${section.code ? ` (${section.code})` : ''}` }))} onChange={(sectionId) => setFormData({ ...formData, sectionId })} />
              <StudentField label="Student Phone" value={formData.phone} error={formErrors.phone} onChange={(phone) => setFormData({ ...formData, phone })} />
              <StudentField label="Parent Phone" value={formData.parentPhone} error={formErrors.parentPhone} onChange={(parentPhone) => setFormData({ ...formData, parentPhone })} />
              <SelectField label="Status" value={formData.isActive === false ? 'false' : 'true'} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} onChange={(value) => setFormData({ ...formData, isActive: value !== 'false' })} />
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


const ImportStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
    <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</div>
    <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
  </div>
);

const StudentField: React.FC<{
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, error, disabled, required = true, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
    <input
      disabled={disabled}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
      aria-label={label}
      required={required}
    />
    {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, error, options, onChange }) => (
  <div className="space-y-2">
    <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
    <select
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
      aria-label={label}
    >
      <option value="">Select {label.toLowerCase()}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
  </div>
);
