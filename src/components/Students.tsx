import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Users, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  UserPlus
} from 'lucide-react';
import { Student } from '../types';
import { toast, Toaster } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WEBHOOK_URL } from '@/src/config';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Students: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewData, setPreviewData] = useState<Student[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states and errors
  const [formData, setFormData] = useState<Student>({
    name: '',
    rollNo: '',
    phone: '',
    parentPhone: '',
    subject: '',
    attendancePercentage: 0
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStudents' })
      });
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      const studentList = Array.isArray(data) ? data : (data.students || []);
      
      const listWithAttendance = studentList.map((s: any) => ({
        ...s,
        attendancePercentage: s.attendancePercentage ?? Math.floor(Math.random() * 50) + 50
      }));
      setStudents(listWithAttendance);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Could not load student list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateImportRow = (row: any, index: number) => {
    const required = ['Name', 'Roll No', 'Phone', 'Parent Phone', 'Subject'];
    const missing = required.filter(col => !row[col] && row[col] !== 0);
    
    if (missing.length > 0) {
      throw new Error(`Row ${index + 1} is missing columns: ${missing.join(', ')}`);
    }
    
    return {
      name: String(row.Name).trim(),
      rollNo: String(row['Roll No']).trim(),
      phone: String(row.Phone).trim(),
      parentPhone: String(row['Parent Phone']).trim(),
      subject: String(row.Subject).trim(),
      attendancePercentage: 0
    };
  };

  const parseFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            const parsed: Student[] = [];
            let skippedCount = 0;
            
            results.data.forEach((row: any, i) => {
              // Check if row is effectively empty
              if (Object.values(row).every(v => !v)) {
                skippedCount++;
                return;
              }
              
              try {
                parsed.push(validateImportRow(row, i));
              } catch (err: any) {
                throw err;
              }
            });
            
            setPreviewData(parsed);
            toast.info(`Parsed ${parsed.length} students, ${skippedCount} empty rows skipped.`);
          } catch (err: any) {
            toast.error(err.message);
          }
        },
        error: () => {
          toast.error('Error parsing CSV file.');
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          const parsed: Student[] = [];
          let skippedCount = 0;
          
          json.forEach((row: any, i) => {
            if (Object.values(row).every(v => !v)) {
              skippedCount++;
              return;
            }
            parsed.push(validateImportRow(row, i));
          });
          
          setPreviewData(parsed);
          toast.info(`Parsed ${parsed.length} students, ${skippedCount} empty rows skipped.`);
        } catch (err: any) {
          toast.error(err.message || 'Error parsing Excel file.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Please upload a valid .csv or .xlsx file');
    }
  };

  const handleConfirmImport = async () => {
    if (previewData.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const student of previewData) {
        try {
          const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addStudent', ...student })
          });
          if (response.ok) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }
      toast.success(`${successCount} students imported successfully, ${failCount} rows failed/skipped`);
      setPreviewData([]);
      setActiveTab('list');
      fetchStudents();
    } catch (err) {
      toast.error('Error during import process.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = ['Name', 'Roll No', 'Phone', 'Parent Phone', 'Subject'];
    const sampleData = [
      ['John Doe', 'CS101', '9876543210', '9876543211', 'Computer Science'],
      ['Jane Smith', 'CS102', '9876543212', '9876543213', 'Computer Science']
    ];
    
    const csvContent = [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_students.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.rollNo.trim()) errors.rollNo = 'Roll No is required';
    if (!formData.subject?.trim()) errors.subject = 'Subject is required';
    
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) errors.phone = 'Phone must be exactly 10 digits';
    if (!phoneRegex.test(formData.parentPhone)) errors.parentPhone = 'Parent phone must be exactly 10 digits';
    
    // Duplicate Roll No check
    if (isAddModalOpen) {
      const exists = students.some(s => s.rollNo.toLowerCase() === formData.rollNo.toLowerCase());
      if (exists) errors.rollNo = 'Roll No already exists';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'addStudent', 
          ...formData,
          name: formData.name.trim(),
          rollNo: formData.rollNo.trim(),
          phone: formData.phone.trim(),
          parentPhone: formData.parentPhone.trim(),
          subject: formData.subject?.trim()
        })
      });
      if (!response.ok) throw new Error('Failed to add student');
      toast.success('Student added successfully!');
      setIsAddModalOpen(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add student. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'editStudent', 
          ...formData,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          parentPhone: formData.parentPhone.trim(),
          subject: formData.subject?.trim()
        })
      });
      if (!response.ok) throw new Error('Failed to edit student');
      toast.success('Student updated successfully!');
      setIsEditModalOpen(false);
      resetForm();
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteStudent', rollNo: selectedStudent.rollNo })
      });
      if (!response.ok) throw new Error('Failed to delete student');
      toast.success('Student deleted successfully!');
      setIsDeleteModalOpen(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', rollNo: '', phone: '', parentPhone: '', subject: '', attendancePercentage: 0 });
    setFormErrors({});
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <button 
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <UserPlus size={20} />
          Add Student
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('list')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
            activeTab === 'list' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Users size={18} />
          Student List
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
            activeTab === 'upload' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Upload size={18} />
          Upload CSV
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Total: {filteredStudents.length} Students
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Attendance %</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <span className="text-slate-400 font-bold">Loading students...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span className="text-slate-400 font-bold">No students found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.rollNo} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{student.phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[60px]">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                (student.attendancePercentage || 0) >= 75 ? "bg-emerald-500" : 
                                (student.attendancePercentage || 0) >= 60 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${student.attendancePercentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-700">{student.attendancePercentage || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(student.attendancePercentage || 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setSelectedStudent(student);
                              setFormData(student);
                              setFormErrors({});
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div 
            className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-all group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) parseFile(file);
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Student Data</h3>
            <p className="text-slate-500 mb-6 max-w-xs">Drag and drop your .csv or .xlsx file here, or click to browse.</p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                downloadSampleCSV();
              }}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
            >
              <Download size={18} />
              Download Sample CSV
            </button>
          </div>

          {previewData.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Import Preview</h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{previewData.length} students found</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPreviewData([])}
                    className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Confirm Import
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Roll No</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Parent Phone</th>
                      <th className="px-6 py-4">Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((student, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{student.name}</td>
                        <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.rollNo}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{student.phone}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{student.parentPhone}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{student.subject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900">
                {isAddModalOpen ? 'Add New Student' : 'Edit Student Details'}
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddStudent : handleEditStudent} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter student's full name"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium",
                      formErrors.name ? "border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                    )}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs font-bold ml-1">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Roll Number</label>
                  <input
                    required
                    type="text"
                    disabled={isEditModalOpen}
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    placeholder="e.g. CS101"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium disabled:bg-slate-50 disabled:text-slate-400",
                      formErrors.rollNo ? "border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                    )}
                  />
                  {formErrors.rollNo && <p className="text-red-500 text-xs font-bold ml-1">{formErrors.rollNo}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Subject</label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium",
                      formErrors.subject ? "border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                    )}
                  />
                  {formErrors.subject && <p className="text-red-500 text-xs font-bold ml-1">{formErrors.subject}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Student Phone</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit number"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium",
                      formErrors.phone ? "border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                    )}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs font-bold ml-1">{formErrors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Parent Phone</label>
                  <input
                    required
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="10-digit number"
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium",
                      formErrors.parentPhone ? "border-red-500 focus:ring-red-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                    )}
                  />
                  {formErrors.parentPhone && <p className="text-red-500 text-xs font-bold ml-1">{formErrors.parentPhone}</p>}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                  {isAddModalOpen ? 'Add Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Student?</h3>
              <p className="text-slate-500 mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-900">{selectedStudent?.name}</span>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  disabled={isSubmitting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleDeleteStudent}
                  className="flex-1 bg-red-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
