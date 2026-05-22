import { apiClient } from './client';
interface ApiResponse<T> { success: boolean; data: T }
export interface CourseOption { id: string; name: string; code?: string }
export interface SectionOption { id: string; name: string; courseId: string }
export interface SubjectOption { id: string; name: string; courseId: string }
export interface UserOption { id: string; name: string; email: string }
export interface StaffOption { id: string; employeeCode: string; staffRole: string; user?: { name: string; email: string } }
export interface AcademicOptions { courses: CourseOption[]; sections: SectionOption[]; subjects: SubjectOption[]; teachers: UserOption[]; staff: StaffOption[] }
export interface ExamTimetable { id: string; examTitle: string; examDate: string; startTime: string; endTime: string; room?: string | null; course?: CourseOption; section?: SectionOption | null; subject?: SubjectOption; invigilator?: UserOption | null }
export interface ClassTimetable { id: string; dayOfWeek: number; period: string; startTime: string; endTime: string; room?: string | null; course?: CourseOption; section?: SectionOption | null; subject?: SubjectOption; teacher?: UserOption }
export interface Notice { id: string; title: string; message: string; targetRole?: string | null; expiresAt?: string | null; createdAt: string }
export interface AcademicResource { id: string; title: string; description?: string | null; resourceType: string; resourceUrl: string; course?: CourseOption; section?: SectionOption | null; subject?: SubjectOption; createdAt: string }
export interface Lab { id: string; name: string; code: string; location?: string | null; capacity?: number | null; inChargeId?: string | null; inCharge?: StaffOption | null }
export interface LabTimetable { id: string; dayOfWeek: number; startTime: string; endTime: string; lab?: Lab; course?: CourseOption; section?: SectionOption | null; subject?: SubjectOption | null }
export interface PortalAcademicFeed { exams: ExamTimetable[]; timetable: ClassTimetable[]; notices: Notice[]; resources: AcademicResource[] }
export interface AcademicDashboardSummary { upcomingExams: number; todayTimetable: number; latestNotices: number; sharedResourcesCount: number }

export const getAcademicOptions = () => apiClient<ApiResponse<AcademicOptions>>('/academic-ops/options');
export const getAcademicDashboardSummary = () => apiClient<ApiResponse<AcademicDashboardSummary>>('/academic-ops/dashboard-summary');
export const getExamTimetables = () => apiClient<ApiResponse<ExamTimetable[]>>('/academic-ops/exams');
export const createExamTimetable = (data: Record<string, unknown>) => apiClient<ApiResponse<ExamTimetable>>('/academic-ops/exams', { method: 'POST', body: JSON.stringify(data) });
export const deleteExamTimetable = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/exams/${id}`, { method: 'DELETE' });
export const getClassTimetables = () => apiClient<ApiResponse<ClassTimetable[]>>('/academic-ops/class-timetable');
export const createClassTimetable = (data: Record<string, unknown>) => apiClient<ApiResponse<ClassTimetable>>('/academic-ops/class-timetable', { method: 'POST', body: JSON.stringify(data) });
export const deleteClassTimetable = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/class-timetable/${id}`, { method: 'DELETE' });
export const getNotices = () => apiClient<ApiResponse<Notice[]>>('/academic-ops/notices');
export const createNotice = (data: Record<string, unknown>) => apiClient<ApiResponse<Notice>>('/academic-ops/notices', { method: 'POST', body: JSON.stringify(data) });
export const deleteNotice = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/notices/${id}`, { method: 'DELETE' });
export const getResources = () => apiClient<ApiResponse<AcademicResource[]>>('/academic-ops/resources');
export const createResource = (data: Record<string, unknown>) => apiClient<ApiResponse<AcademicResource>>('/academic-ops/resources', { method: 'POST', body: JSON.stringify(data) });
export const deleteResource = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/resources/${id}`, { method: 'DELETE' });
export const getLabs = () => apiClient<ApiResponse<Lab[]>>('/academic-ops/labs');
export const createLab = (data: Record<string, unknown>) => apiClient<ApiResponse<Lab>>('/academic-ops/labs', { method: 'POST', body: JSON.stringify(data) });
export const deleteLab = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/labs/${id}`, { method: 'DELETE' });
export const getLabTimetables = () => apiClient<ApiResponse<LabTimetable[]>>('/academic-ops/lab-timetable');
export const createLabTimetable = (data: Record<string, unknown>) => apiClient<ApiResponse<LabTimetable>>('/academic-ops/lab-timetable', { method: 'POST', body: JSON.stringify(data) });
export const deleteLabTimetable = (id: string) => apiClient<ApiResponse<unknown>>(`/academic-ops/lab-timetable/${id}`, { method: 'DELETE' });
export const getPortalAcademicFeed = () => apiClient<ApiResponse<PortalAcademicFeed>>('/portal/academic-feed');
