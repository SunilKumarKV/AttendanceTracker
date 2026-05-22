export {
  createAttendanceSession,
  getAttendanceSession,
  getAttendanceSessions,
  lockAttendanceSession,
  updateAttendanceSession,
} from './professor';
export type {
  AttendanceRecordInput,
  AttendanceSession,
  AttendanceSessionFilters,
  ProfessorAssignment as TeacherAssignment,
  ProfessorDashboard as TeacherDashboard,
} from './professor';
export {
  getProfessorAssignments as getTeacherAssignments,
  getProfessorClassStudents as getTeacherClassStudents,
  getProfessorDashboard as getTeacherDashboard,
} from './professor';
