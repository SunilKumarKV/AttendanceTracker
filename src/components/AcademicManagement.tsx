import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit2, Filter, GraduationCap, Layers, Link2, Plus, Search, Trash2, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  AcademicResource,
  Course,
  createAcademicResource,
  deleteAcademicResource,
  getAcademicResource,
  getProfessors,
  Professor,
  ProfessorAssignment,
  Section,
  Semester,
  Subject,
  updateAcademicResource,
} from '../api/admin';
import { ConfirmDialog, EmptyState, ErrorState, Pagination, TableSkeleton } from './common';
import { useDebounce } from '../hooks';

type TabKey = AcademicResource;
type AcademicItem = Course | Semester | Section | Subject | ProfessorAssignment;
type FormState = Record<string, string>;
type Option = { value: string; label: string; courseId?: string; semesterId?: string | null };
type OptionGroups = {
  courses: Option[];
  semesters: Option[];
  sections: Option[];
  subjects: Option[];
  professors: Option[];
};

const pageSize = 10;

const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'classes', label: 'Classes', icon: GraduationCap },
  { key: 'semesters', label: 'Semesters', icon: Layers },
  { key: 'sections', label: 'Sections', icon: BookOpen },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Link2 },
];

const blankForms: Record<TabKey, FormState> = {
  classes: { name: '', code: '', description: '', isActive: 'true' },
  semesters: { courseId: '', name: '', number: '', isActive: 'true' },
  sections: { courseId: '', semesterId: '', name: '', code: '', capacity: '', isActive: 'true' },
  subjects: { courseId: '', semesterId: '', name: '', code: '', credits: '', isActive: 'true' },
  assignments: { professorId: '', courseId: '', semesterId: '', sectionId: '', subjectId: '', isActive: 'true' },
};

const labels: Record<TabKey, string> = {
  classes: 'Class',
  semesters: 'Semester',
  sections: 'Section',
  subjects: 'Subject',
  assignments: 'Assignment',
};

const isAssignment = (item: AcademicItem): item is ProfessorAssignment => 'professorId' in item && 'subjectId' in item;
const isSemester = (item: AcademicItem): item is Semester => 'number' in item;

const itemName = (item: AcademicItem) => {
  if (isAssignment(item)) return `${item.professor?.name ?? 'Professor'} -> ${item.subject?.name ?? 'Subject'}`;
  return 'name' in item ? item.name : 'Record';
};

export const AcademicManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('classes');
  const [items, setItems] = useState<AcademicItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FormState>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicItem | null>(null);
  const [deleting, setDeleting] = useState<AcademicItem | null>(null);
  const [form, setForm] = useState<FormState>(blankForms.classes);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const options: OptionGroups = useMemo(() => ({
    courses: courses.map((course) => ({ value: course.id, label: `${course.name} (${course.code})` })),
    semesters: semesters
      .filter((semester) => !form.courseId || semester.courseId === form.courseId)
      .map((semester) => ({ value: semester.id, label: `${semester.name} (${semester.course?.name ?? 'Class'})`, courseId: semester.courseId })),
    sections: sections
      .filter((section) => (!form.courseId || section.courseId === form.courseId) && (!form.semesterId || section.semesterId === form.semesterId))
      .map((section) => ({ value: section.id, label: `${section.name} (${section.code ?? 'No code'})`, courseId: section.courseId, semesterId: section.semesterId })),
    subjects: subjects
      .filter((subject) => (!form.courseId || subject.courseId === form.courseId) && (!form.semesterId || subject.semesterId === form.semesterId))
      .map((subject) => ({ value: subject.id, label: `${subject.name} (${subject.code})`, courseId: subject.courseId, semesterId: subject.semesterId })),
    professors: professors.map((professor) => ({ value: professor.id, label: `${professor.name} (${professor.employeeId})` })),
  }), [courses, form.courseId, form.semesterId, professors, sections, semesters, subjects]);

  const loadReferences = useCallback(async () => {
    const [courseResponse, semesterResponse, sectionResponse, subjectResponse, professorResponse] = await Promise.all([
      getAcademicResource<Course>('classes', { pageSize: 100 }),
      getAcademicResource<Semester>('semesters', { pageSize: 100 }),
      getAcademicResource<Section>('sections', { pageSize: 100 }),
      getAcademicResource<Subject>('subjects', { pageSize: 100 }),
      getProfessors('', 1, 100),
    ]);
    setCourses(courseResponse.data.items);
    setSemesters(semesterResponse.data.items);
    setSections(sectionResponse.data.items);
    setSubjects(subjectResponse.data.items);
    setProfessors(professorResponse.data.items);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: debouncedSearch,
        page,
        pageSize,
        courseId: filters.courseId,
        semesterId: filters.semesterId,
        sectionId: filters.sectionId,
        subjectId: filters.subjectId,
        professorId: filters.professorId,
      };
      const response = await getAcademicResource<AcademicItem>(activeTab, params);
      setItems(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not load ${activeTab}.`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, filters.courseId, filters.professorId, filters.sectionId, filters.semesterId, filters.subjectId, page]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setFilters({});
  }, [activeTab]);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openModal = (item?: AcademicItem) => {
    setEditing(item ?? null);
    if (!item) {
      setForm(blankForms[activeTab]);
    } else if (isAssignment(item)) {
      setForm({
        professorId: item.professorId,
        courseId: item.courseId,
        semesterId: item.semesterId ?? '',
        sectionId: item.sectionId ?? '',
        subjectId: item.subjectId,
        isActive: String(item.isActive),
      });
    } else if (activeTab === 'subjects') {
      const subject = item as Subject;
      setForm({ courseId: subject.courseId, semesterId: subject.semesterId ?? '', name: subject.name, code: subject.code, credits: subject.credits === null || subject.credits === undefined ? '' : String(subject.credits), isActive: String(subject.isActive ?? true) });
    } else if (isSemester(item)) {
      setForm({ courseId: item.courseId, name: item.name, number: String(item.number), isActive: String(item.isActive ?? true) });
    } else if (activeTab === 'sections') {
      const section = item as Section;
      setForm({ courseId: section.courseId, semesterId: section.semesterId ?? '', name: section.name, code: section.code ?? '', capacity: section.capacity ? String(section.capacity) : '', isActive: String(section.isActive ?? true) });
    } else {
      const course = item as Course;
      setForm({ name: course.name, code: course.code, description: course.description ?? '', isActive: String(course.isActive ?? true) });
    }
    setModalOpen(true);
  };

  const payloadFromForm = () => {
    if (activeTab === 'classes') return { name: form.name.trim(), code: form.code.trim(), description: form.description?.trim() || null, isActive: form.isActive !== 'false' };
    if (activeTab === 'semesters') return { courseId: form.courseId, name: form.name.trim(), number: Number(form.number), isActive: form.isActive !== 'false' };
    if (activeTab === 'sections') return { courseId: form.courseId, semesterId: form.semesterId || null, name: form.name.trim(), code: form.code?.trim() || form.name.trim(), capacity: form.capacity ? Number(form.capacity) : null, isActive: form.isActive !== 'false' };
    if (activeTab === 'subjects') return { courseId: form.courseId, semesterId: form.semesterId || null, name: form.name.trim(), code: form.code.trim(), credits: form.credits ? Number(form.credits) : null, isActive: form.isActive !== 'false' };
    return {
      professorId: form.professorId,
      courseId: form.courseId,
      semesterId: form.semesterId || null,
      sectionId: form.sectionId || null,
      subjectId: form.subjectId,
      isActive: form.isActive !== 'false',
    };
  };

  const validate = () => {
    const required: Record<TabKey, string[]> = {
      classes: ['name', 'code'],
      semesters: ['courseId', 'name', 'number'],
      sections: ['courseId', 'semesterId', 'name', 'code'],
      subjects: ['courseId', 'name', 'code'],
      assignments: ['professorId', 'courseId', 'semesterId', 'sectionId', 'subjectId'],
    };
    const missing = required[activeTab].filter((key) => !form[key]?.trim());
    if (missing.length > 0) {
      toast.error(`Please complete: ${missing.join(', ')}`);
      return false;
    }
    if (form.number && Number(form.number) < 1) {
      toast.error('Semester number must be at least 1.');
      return false;
    }
    if (form.credits && Number(form.credits) < 0) {
      toast.error('Credits cannot be negative.');
      return false;
    }
    if (form.capacity && Number(form.capacity) < 1) {
      toast.error('Capacity must be at least 1.');
      return false;
    }
    return true;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await updateAcademicResource(activeTab, editing.id, payloadFromForm());
        toast.success(`${labels[activeTab]} updated.`);
      } else {
        await createAcademicResource(activeTab, payloadFromForm());
        toast.success(`${labels[activeTab]} created.`);
      }
      setModalOpen(false);
      setEditing(null);
      await loadReferences();
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save ${labels[activeTab].toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting?.id) return;
    setSaving(true);
    try {
      await deleteAcademicResource(activeTab, deleting.id);
      toast.success(`${labels[activeTab]} deleted.`);
      setDeleting(null);
      await loadReferences();
      await loadItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not delete ${labels[activeTab].toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const activeLabel = labels[activeTab];

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <Toaster position="top-right" />
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Academic Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage classes, terms, sections, subjects, and professor assignments.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
          <Plus size={18} />
          Add {activeLabel}
        </button>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="flex w-max gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/70 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeTab}...`}
              aria-label={`Search ${activeTab}`}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          {activeTab !== 'classes' ? (
            <div className="flex flex-wrap gap-2">
              <Filter className="mt-2 text-slate-400" size={18} />
              <Select value={filters.courseId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, courseId: value || undefined, semesterId: undefined, sectionId: undefined, subjectId: undefined }))} options={options.courses} placeholder="All classes" />
              {(activeTab === 'sections' || activeTab === 'subjects' || activeTab === 'assignments') && <Select value={filters.semesterId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, semesterId: value || undefined }))} options={options.semesters} placeholder="All semesters" />}
              {activeTab === 'assignments' && <Select value={filters.professorId ?? ''} onChange={(value) => setFilters((current) => ({ ...current, professorId: value || undefined }))} options={options.professors} placeholder="All professors" />}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="p-6"><ErrorState title={`Could not load ${activeTab}`} message={error} onAction={() => void loadItems()} /></div>
        ) : loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : items.length === 0 ? (
          <div className="p-6"><EmptyState title={`No ${activeTab} found`} message={`Create a ${activeLabel.toLowerCase()} to continue configuring AttendanceTracker.`} actionLabel={`Add ${activeLabel}`} onAction={() => openModal()} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50/70 text-xs font-bold uppercase tracking-widest text-slate-400 dark:bg-slate-900/70">
                <tr>{headers(activeTab).map((header) => <th key={header} className="px-6 py-4">{header}</th>)}<th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
                    {cells(activeTab, item).map((cell, index) => <td key={`${item.id}-${index}`} className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{cell}</td>)}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openModal(item)} aria-label={`Edit ${itemName(item)}`} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50"><Edit2 size={17} /></button>
                        <button type="button" onClick={() => setDeleting(item)} aria-label={`Delete ${itemName(item)}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && items.length > 0 && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Edit' : 'Add'} {activeLabel}</h3>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close academic form" className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={save} className="grid gap-4 p-6 sm:grid-cols-2">
              {formFields(activeTab, form, options).map((field) => (
                <FormField key={field.name} field={field} value={form[field.name] ?? ''} onChange={(value) => setForm((current) => ({
                  ...current,
                  [field.name]: value,
                  ...(field.name === 'courseId' ? { semesterId: '', sectionId: '', subjectId: '' } : {}),
                  ...(field.name === 'semesterId' ? { sectionId: '', subjectId: '' } : {}),
                }))} />
              ))}
              <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${activeLabel}?`}
        message={`This will remove ${deleting ? itemName(deleting) : 'this record'}. Records that are already referenced may be blocked by the database.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

const headers = (tab: TabKey) => {
  if (tab === 'classes') return ['Name', 'Code', 'Linked Records', 'Status'];
  if (tab === 'semesters') return ['Name', 'Number', 'Class', 'Status'];
  if (tab === 'sections') return ['Name', 'Code', 'Class', 'Semester', 'Capacity', 'Status'];
  if (tab === 'subjects') return ['Name', 'Code', 'Class', 'Semester', 'Credits', 'Status'];
  return ['Professor', 'Class', 'Semester', 'Section', 'Subject', 'Status'];
};

const cells = (tab: TabKey, item: AcademicItem) => {
  if (tab === 'classes') {
    const course = item as Course;
    const linked = `${course._count?.semesters ?? 0} sem / ${course._count?.sections ?? 0} sec / ${course._count?.subjects ?? 0} subj / ${course._count?.students ?? 0} stu`;
    return [course.name, course.code, linked, course.isActive === false ? 'Inactive' : 'Active'];
  }
  if (tab === 'semesters' && isSemester(item)) return [item.name, String(item.number), item.course?.name ?? item.courseId, item.isActive === false ? 'Inactive' : 'Active'];
  if (tab === 'sections') {
    const section = item as Section;
    return [section.name, section.code ?? '-', section.course?.name ?? section.courseId, section.semester?.name ?? '-', section.capacity ?? '-', section.isActive === false ? 'Inactive' : 'Active'];
  }
  if (tab === 'subjects') {
    const subject = item as Subject;
    return [subject.name, subject.code, subject.course?.name ?? subject.courseId, subject.semester?.name ?? '-', subject.credits ?? '-', subject.isActive === false ? 'Inactive' : 'Active'];
  }
  if (isAssignment(item)) return [item.professor?.name ?? item.professorId, item.course?.name ?? item.courseId, item.semester?.name ?? '-', item.section?.name ?? '-', item.subject?.name ?? item.subjectId, item.isActive ? 'Active' : 'Inactive'];
  return ['-', '-', '-'];
};

interface FieldConfig {
  name: string;
  label: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

const formFields = (tab: TabKey, form: FormState, options: OptionGroups): FieldConfig[] => {
  const semesterOptions = options.semesters.filter((option) => !form.courseId || option.courseId === form.courseId);
  const sectionOptions = options.sections.filter((option) => (
    (!form.courseId || option.courseId === form.courseId)
    && (!form.semesterId || option.semesterId === form.semesterId)
  ));
  const subjectOptions = options.subjects.filter((option) => (
    (!form.courseId || option.courseId === form.courseId)
    && (!form.semesterId || option.semesterId === form.semesterId)
  ));
  if (tab === 'classes') return [
    { name: 'name', label: 'Class Name', required: true },
    { name: 'code', label: 'Class Code', required: true },
    { name: 'description', label: 'Description' },
    { name: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ];
  if (tab === 'semesters') return [
    { name: 'courseId', label: 'Class', options: options.courses, required: true },
    { name: 'name', label: 'Semester Name', required: true },
    { name: 'number', label: 'Semester Number', type: 'number', required: true },
    { name: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ];
  if (tab === 'sections') return [
    { name: 'courseId', label: 'Class', options: options.courses, required: true },
    { name: 'semesterId', label: 'Semester', options: semesterOptions, required: true },
    { name: 'name', label: 'Section Name', required: true },
    { name: 'code', label: 'Section Code', required: true },
    { name: 'capacity', label: 'Capacity', type: 'number' },
    { name: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ];
  if (tab === 'subjects') return [
    { name: 'courseId', label: 'Class', options: options.courses, required: true },
    { name: 'semesterId', label: 'Semester', options: semesterOptions, required: true },
    { name: 'name', label: 'Subject Name', required: true },
    { name: 'code', label: 'Subject Code', required: true },
    { name: 'credits', label: 'Credits', type: 'number' },
    { name: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ];
  return [
    { name: 'professorId', label: 'Professor', options: options.professors, required: true },
    { name: 'courseId', label: 'Class', options: options.courses, required: true },
    { name: 'semesterId', label: 'Semester', options: semesterOptions, required: true },
    { name: 'sectionId', label: 'Section', options: sectionOptions, required: true },
    { name: 'subjectId', label: 'Subject', options: subjectOptions, required: true },
    { name: 'isActive', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
  ];
};

const Select: React.FC<{ value: string; onChange: (value: string) => void; options: Option[]; placeholder: string }> = ({ value, onChange, options, placeholder }) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
    <option value="">{placeholder}</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

const FormField: React.FC<{ field: FieldConfig; value: string; onChange: (value: string) => void }> = ({ field, value, onChange }) => (
  <label className="space-y-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
    {field.label}{field.required ? ' *' : ''}
    {field.options ? (
      <select required={field.required} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950">
        <option value="">Select {field.label.toLowerCase()}</option>
        {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    ) : (
      <input required={field.required} type={field.type ?? 'text'} min={field.type === 'number' ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
    )}
  </label>
);
