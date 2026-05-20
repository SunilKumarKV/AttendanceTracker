import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Key, 
  X, 
  AlertCircle,
  Mail,
  User as UserIcon,
  Phone,
  BookOpen,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { User } from '../types';

interface Professor extends User {
  status: 'Active' | 'Inactive';
}

const initialProfessors: Professor[] = [
  {
    name: 'Dr. Sarah Wilson',
    email: 'sarah.wilson@university.edu',
    employeeId: 'EMP001',
    subject: 'Computer Science',
    department: 'Engineering',
    phone: '+1 234 567 8901',
    role: 'Professor',
    status: 'Active'
  },
  {
    name: 'Prof. Michael Chen',
    email: 'm.chen@university.edu',
    employeeId: 'EMP002',
    subject: 'Mathematics',
    department: 'Science',
    phone: '+1 234 567 8902',
    role: 'Professor',
    status: 'Active'
  },
  {
    name: 'Dr. Emily Brown',
    email: 'e.brown@university.edu',
    employeeId: 'EMP003',
    subject: 'Physics',
    department: 'Science',
    phone: '+1 234 567 8903',
    role: 'Professor',
    status: 'Inactive'
  },
  {
    name: 'Prof. James Miller',
    email: 'j.miller@university.edu',
    employeeId: 'EMP004',
    subject: 'Data Structures',
    department: 'Engineering',
    phone: '+1 234 567 8904',
    role: 'Professor',
    status: 'Active'
  }
];

export const ManageProfessors: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>(initialProfessors);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [deletingProfessor, setDeletingProfessor] = useState<Professor | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    subject: '',
    phone: '',
    department: ''
  });

  const filteredProfessors = professors.filter(prof => 
    prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (prof: Professor | null = null) => {
    if (prof) {
      setEditingProfessor(prof);
      setFormData({
        name: prof.name,
        email: prof.email,
        employeeId: prof.employeeId || '',
        subject: prof.subject || '',
        phone: prof.phone || '',
        department: prof.department || ''
      });
    } else {
      setEditingProfessor(null);
      setFormData({
        name: '',
        email: '',
        employeeId: '',
        subject: '',
        phone: '',
        department: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProfessor(null);
  };

  const sendToWebhook = async (data: any) => {
    try {
      console.log('Sending to webhook:', data);
    } catch (error) {
      console.error('Webhook error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProfessor) {
      // Edit logic
      const updatedProfs = professors.map(p => 
        p.employeeId === editingProfessor.employeeId ? { ...p, ...formData } : p
      );
      setProfessors(updatedProfs);
      
      await sendToWebhook({
        action: 'editProfessor',
        employeeId: editingProfessor.employeeId,
        ...formData
      });
      
      toast.success('Professor updated successfully');
    } else {
      // Add logic
      const newProf: Professor = {
        ...formData,
        role: 'Professor',
        status: 'Active'
      };
      setProfessors([...professors, newProf]);
      
      await sendToWebhook({
        action: 'addProfessor',
        ...formData
      });
      
      toast.success('Professor added successfully', {
        description: 'Default password set to: Prof@123',
        duration: 5000,
      });
    }
    
    handleCloseModal();
  };

  const handleDeleteClick = (prof: Professor) => {
    setDeletingProfessor(prof);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingProfessor) {
      const updatedProfs = professors.filter(p => p.employeeId !== deletingProfessor.employeeId);
      setProfessors(updatedProfs);
      
      await sendToWebhook({
        action: 'deleteProfessor',
        employeeId: deletingProfessor.employeeId
      });
      
      toast.error('Professor removed');
      setIsDeleteConfirmOpen(false);
      setDeletingProfessor(null);
    }
  };

  const handleResetPassword = async (prof: Professor) => {
    await sendToWebhook({
      action: 'resetPassword',
      employeeId: prof.employeeId
    });
    
    toast.info(`Password reset for ${prof.name}`, {
      description: 'New password: Prof@123',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
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

      {/* Professors Table */}
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
              {filteredProfessors.map((prof) => (
                <tr key={prof.employeeId} className="hover:bg-slate-50/50 transition-colors group">
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
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{prof.subject}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{prof.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                      ${prof.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${prof.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {prof.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(prof)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Professor"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(prof)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(prof)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Professor"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProfessors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="text-slate-200" />
                      <p className="font-medium">No professors found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    {editingProfessor ? <Edit2 className="text-white w-5 h-5" /> : <UserPlus className="text-white w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingProfessor ? 'Edit Professor' : 'Add New Professor'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {editingProfessor ? 'Update existing faculty details' : 'Register a new faculty member'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <UserIcon size={14} className="text-blue-500" />
                      Full Name
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="e.g. Dr. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Mail size={14} className="text-blue-500" />
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="john.doe@university.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-blue-500" />
                      Employee ID
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="EMP001"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <BookOpen size={14} className="text-blue-500" />
                      Subject
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="e.g. Computer Science"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Phone size={14} className="text-blue-500" />
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      placeholder="+1 234 567 8900"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Building2 size={14} className="text-blue-500" />
                      Department
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Science">Science</option>
                      <option value="Arts">Arts</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Medical">Medical</option>
                    </select>
                  </div>
                </div>

                {!editingProfessor && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <AlertCircle className="text-blue-600 w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Security Note</p>
                      <p className="text-xs text-blue-700 font-medium leading-relaxed">
                        A default password <span className="font-bold">Prof@123</span> will be assigned. 
                        The professor will be prompted to change it on their first login.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    {editingProfessor ? 'Save Changes' : 'Register Professor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 border-4 border-white shadow-inner">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Professor?</h3>
              <p className="text-slate-500 font-medium mb-8">
                Are you sure you want to remove <span className="text-slate-900 font-bold">{deletingProfessor?.name}</span>? 
                This action cannot be undone and all associated data will be archived.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Keep Professor
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
