export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HOD', 'TEACHER', 'PROFESSOR', 'STUDENT', 'PARENT', 'STAFF'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
