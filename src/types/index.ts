export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PROFESSOR';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface Student {
  id?: string;
  courseId?: string;
  sectionId?: string;
  name: string;
  rollNo: string;
  phone: string;
  parentPhone: string;
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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
