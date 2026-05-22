export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'HOD' | 'TEACHER' | 'PROFESSOR';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface Student {
  id?: string;
  courseId?: string;
  sectionId?: string;
  name: string;
  rollNo: string;
  phone: string;
  parentPhone: string;
  email?: string;
  semesterId?: string;
  isActive?: boolean;
  subject?: string;
  attendancePercentage?: number;
  status?: AttendanceStatus;
}

export interface User {
  id?: string;
  institutionId?: string | null;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  college?: string;
  department?: string;
  avatar?: string;
  subject?: string;
  employeeId?: string;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
