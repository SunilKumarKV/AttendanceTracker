import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, FlaskConical, Megaphone, Upload, Trash2, BookOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from './MainLayout';
import { EmptyState, ErrorState, Loader } from './common';
import * as api from '../api/academicOps';

type Tab = 'exams' | 'classes' | 'notices' | 'resources' | 'labs';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const input = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const button = 'rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50';

export const AcademicOperations: React.FC = () => {
  const [tab, setTab] = useState<Tab>('exams');
  const [options, setOptions] = useState<api.AcademicOptions | null>(null);
  const [exams, setExams] = useState<api.ExamTimetable[]>([]);
  const [classes, setClasses] = useState<api.ClassTimetable[]>([]);
  const [notices, setNotices] = useState<api.Notice[]>([]);
  const [resources, setResources] = useState<api.AcademicResource[]>([]);
  const [labs, setLabs] = useState<api.Lab[]>([]);
  const [labTimetable, setLabTimetable] = useState<api.LabTimetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ dayOfWeek: '1', period: '1', resourceType: 'PDF' });

  const sections = useMemo(() => options?.sections.filter((s) => !form.courseId || s.courseId === form.courseId) ?? [], [options, form.courseId]);
  const subjects = useMemo(() => options?.subjects.filter((s) => !form.courseId || s.courseId === form.courseId) ?? [], [options, form.courseId]);

  const update = (key: string, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [opt, examData, classData, noticeData, resourceData, labData, labTimeData] = await Promise.all([
        api.getAcademicOptions(), api.getExamTimetables(), api.getClassTimetables(), api.getNotices(), api.getResources(), api.getLabs(), api.getLabTimetables(),
      ]);
      setOptions(opt.data); setExams(examData.data); setClasses(classData.data); setNotices(noticeData.data); setResources(resourceData.data); setLabs(labData.data); setLabTimetable(labTimeData.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load academic operations.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const reset = () => setForm({ dayOfWeek: '1', period: '1', resourceType: 'PDF' });
  const submit = async () => {
    setSaving(true);
    try {
      if (tab === 'exams') await api.createExamTimetable(form);
      if (tab === 'classes') await api.createClassTimetable(form);
      if (tab === 'notices') await api.createNotice(form);
      if (tab === 'resources') await api.createResource(form);
      if (tab === 'labs') {
        if (form.labId) await api.createLabTimetable(form); else await api.createLab(form);
      }
      toast.success('Saved successfully'); reset(); await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (kind: Tab | 'labTime', id: string) => {
    try {
      if (kind === 'exams') await api.deleteExamTimetable(id);
      if (kind === 'classes') await api.deleteClassTimetable(id);
      if (kind === 'notices') await api.deleteNotice(id);
      if (kind === 'resources') await api.deleteResource(id);
      if (kind === 'labs') await api.deleteLab(id);
      if (kind === 'labTime') await api.deleteLabTimetable(id);
      toast.success('Removed'); await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Remove failed'); }
  };

  if (loading) return <MainLayout><Loader label="Loading academic operations..." /></MainLayout>;
  if (error) return <MainLayout><ErrorState title="Academic operations unavailable" message={error} onAction={load} /></MainLayout>;

  return <MainLayout>
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Version 1.6</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Academic Operations</h1>
        <p className="mt-1 text-sm text-slate-500">Manage exam timetables, class timetables, notices, academic resources, and labs.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ['exams', CalendarDays, 'Exam Timetable'], ['classes', Clock, 'Class Timetable'], ['notices', Megaphone, 'Notices'], ['resources', Upload, 'Resources'], ['labs', FlaskConical, 'Labs'],
        ].map(([value, Icon, label]) => <button key={String(value)} onClick={() => { setTab(value as Tab); reset(); }} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}><Icon size={16} className="mr-2 inline" />{String(label)}</button>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">{tab === 'labs' && form.labId ? 'Add Lab Slot' : `Create ${tab}`}</h2>
          {(tab === 'exams' || tab === 'classes' || tab === 'resources') && <AcademicSelectors options={options} sections={sections} subjects={subjects} form={form} update={update} />}
          {tab === 'exams' && <><input className={input} placeholder="Exam title" value={form.examTitle ?? ''} onChange={(e) => update('examTitle', e.target.value)} /><input className={`${input} mt-3`} type="date" value={form.examDate ?? ''} onChange={(e) => update('examDate', e.target.value)} /><TimeFields form={form} update={update} /><select className={`${input} mt-3`} value={form.invigilatorId ?? ''} onChange={(e) => update('invigilatorId', e.target.value)}><option value="">Invigilator</option>{options?.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><input className={`${input} mt-3`} placeholder="Room" value={form.room ?? ''} onChange={(e) => update('room', e.target.value)} /></>}
          {tab === 'classes' && <><select className={`${input} mt-3`} value={form.teacherId ?? ''} onChange={(e) => update('teacherId', e.target.value)}><option value="">Teacher</option>{options?.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><DayPeriod form={form} update={update} /><TimeFields form={form} update={update} /><input className={`${input} mt-3`} placeholder="Room" value={form.room ?? ''} onChange={(e) => update('room', e.target.value)} /></>}
          {tab === 'notices' && <><input className={input} placeholder="Title" value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} /><textarea className={`${input} mt-3 min-h-28`} placeholder="Message" value={form.message ?? ''} onChange={(e) => update('message', e.target.value)} /><select className={`${input} mt-3`} value={form.targetRole ?? ''} onChange={(e) => update('targetRole', e.target.value)}><option value="">All roles</option><option>STUDENT</option><option>PARENT</option><option>TEACHER</option><option>STAFF</option></select><input className={`${input} mt-3`} type="date" value={form.expiresAt ?? ''} onChange={(e) => update('expiresAt', e.target.value)} /></>}
          {tab === 'resources' && <><input className={`${input} mt-3`} placeholder="Title" value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} /><select className={`${input} mt-3`} value={form.resourceType ?? 'PDF'} onChange={(e) => update('resourceType', e.target.value)}><option>PDF</option><option>NOTES</option><option>BOOK</option><option>LINK</option></select><input className={`${input} mt-3`} placeholder="https://... resource link" value={form.resourceUrl ?? ''} onChange={(e) => update('resourceUrl', e.target.value)} /><textarea className={`${input} mt-3`} placeholder="Description" value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} /></>}
          {tab === 'labs' && <><select className={input} value={form.labId ?? ''} onChange={(e) => update('labId', e.target.value)}><option value="">Create new lab</option>{labs.map((lab) => <option key={lab.id} value={lab.id}>Add timetable for {lab.name}</option>)}</select>{form.labId ? <><AcademicSelectors options={options} sections={sections} subjects={subjects} form={form} update={update} /><DayPeriod form={form} update={update} /><TimeFields form={form} update={update} /></> : <><input className={`${input} mt-3`} placeholder="Lab name" value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} /><input className={`${input} mt-3`} placeholder="Lab code" value={form.code ?? ''} onChange={(e) => update('code', e.target.value)} /><input className={`${input} mt-3`} placeholder="Location" value={form.location ?? ''} onChange={(e) => update('location', e.target.value)} /><select className={`${input} mt-3`} value={form.inChargeId ?? ''} onChange={(e) => update('inChargeId', e.target.value)}><option value="">Lab in-charge</option>{options?.staff.map((staff) => <option key={staff.id} value={staff.id}>{staff.user?.name ?? staff.employeeCode}</option>)}</select></>}</>}
          <button className={`${button} mt-4 w-full`} onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
        <div className="space-y-4">
          {tab === 'exams' && <List items={exams} empty="No exam timetable yet" render={(item) => <Row key={item.id} icon={CalendarDays} title={`${item.examTitle} - ${item.subject?.name ?? ''}`} meta={`${item.course?.name ?? ''} ${item.section?.name ?? ''} • ${new Date(item.examDate).toLocaleDateString()} ${item.startTime}-${item.endTime} • ${item.room ?? 'Room TBA'}`} onDelete={() => remove('exams', item.id)} />} />}
          {tab === 'classes' && <List items={classes} empty="No class timetable yet" render={(item) => <Row key={item.id} icon={Clock} title={`${days[item.dayOfWeek]} Period ${item.period} - ${item.subject?.name ?? ''}`} meta={`${item.course?.name ?? ''} ${item.section?.name ?? ''} • ${item.teacher?.name ?? ''} • ${item.startTime}-${item.endTime}`} onDelete={() => remove('classes', item.id)} />} />}
          {tab === 'notices' && <List items={notices} empty="No notices yet" render={(item) => <Row key={item.id} icon={Megaphone} title={item.title} meta={`${item.targetRole ?? 'All roles'} • ${item.message}`} onDelete={() => remove('notices', item.id)} />} />}
          {tab === 'resources' && <List items={resources} empty="No resources shared yet" render={(item) => <Row key={item.id} icon={BookOpen} title={item.title} meta={`${item.resourceType} • ${item.subject?.name ?? ''} • ${item.resourceUrl}`} onDelete={() => remove('resources', item.id)} />} />}
          {tab === 'labs' && <><List items={labs} empty="No labs yet" render={(item) => <Row key={item.id} icon={FlaskConical} title={`${item.name} (${item.code})`} meta={`${item.location ?? 'No location'} • In-charge: ${item.inCharge?.user?.name ?? 'Not assigned'}`} onDelete={() => remove('labs', item.id)} />} /><List items={labTimetable} empty="No lab timetable yet" render={(item) => <Row key={item.id} icon={Clock} title={`${item.lab?.name ?? 'Lab'} - ${days[item.dayOfWeek]}`} meta={`${item.course?.name ?? ''} ${item.section?.name ?? ''} • ${item.startTime}-${item.endTime}`} onDelete={() => remove('labTime', item.id)} />} /></>}
        </div>
      </div>
    </div>
  </MainLayout>;
};

function AcademicSelectors({ options, sections, subjects, form, update }: { options: api.AcademicOptions | null; sections: api.SectionOption[]; subjects: api.SubjectOption[]; form: Record<string, string>; update: (key: string, value: string) => void }) {
  return <><select className={input} value={form.courseId ?? ''} onChange={(e) => update('courseId', e.target.value)}><option value="">Class</option>{options?.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select><select className={`${input} mt-3`} value={form.sectionId ?? ''} onChange={(e) => update('sectionId', e.target.value)}><option value="">All sections</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}</select><select className={`${input} mt-3`} value={form.subjectId ?? ''} onChange={(e) => update('subjectId', e.target.value)}><option value="">Subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></>;
}
function DayPeriod({ form, update }: { form: Record<string, string>; update: (key: string, value: string) => void }) { return <div className="mt-3 grid grid-cols-2 gap-3"><select className={input} value={form.dayOfWeek ?? '1'} onChange={(e) => update('dayOfWeek', e.target.value)}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><input className={input} placeholder="Period" value={form.period ?? ''} onChange={(e) => update('period', e.target.value)} /></div>; }
function TimeFields({ form, update }: { form: Record<string, string>; update: (key: string, value: string) => void }) { return <div className="mt-3 grid grid-cols-2 gap-3"><input className={input} type="time" value={form.startTime ?? ''} onChange={(e) => update('startTime', e.target.value)} /><input className={input} type="time" value={form.endTime ?? ''} onChange={(e) => update('endTime', e.target.value)} /></div>; }
function List<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => React.ReactNode }) { if (!items.length) return <EmptyState title={empty} message="Create the first record using the form." />; return <div className="space-y-3">{items.map(render)}</div>; }
function Row({ icon: Icon, title, meta, onDelete }: { icon: React.ElementType; title: string; meta: string; onDelete: () => void }) { return <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Icon size={18} /></div><div><p className="font-bold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{meta}</p></div></div><button className="rounded-xl p-2 text-red-500 hover:bg-red-50" onClick={onDelete} aria-label="Remove"><Trash2 size={18} /></button></div>; }
