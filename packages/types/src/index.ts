export interface ScheduleEntry {
  time: string;
  date: string;
  subject: string;
}

export type ClassSessionType =
  | "lecture"
  | "lab"
  | "project"
  | "seminar"
  | "exam";

export type TimetableImportStatus = "pending" | "completed" | "failed";

export interface ClassSession {
  id: number;
  courseId: number;
  timetableImportId: number | null;
  sessionType: ClassSessionType;
  title: string;
  startsAt: string;
  endsAt: string;
  weekday: number | null;
  recurrenceRule: string | null;
  room: string | null;
  lecturerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: number;
  semesterId: number;
  name: string;
  code: string | null;
  lecturerName: string | null;
  room: string | null;
  meetingLink: string | null;
  meetingCode: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  id: number;
  userId: number;
  semesterId: number | null;
  sourceKind: string;
  sourceUrl: string | null;
  sourceFilename: string | null;
  importedAt: string;
  status: TimetableImportStatus;
  importedSectionsCount: number;
  importedEntriesCount: number;
  errorMessage: string | null;
}

export interface WeekSchedule {
  weekStart: string;
  weekEnd: string;
  courses: Course[];
  sessions: ClassSession[];
}

export interface SectionConfig {
  id: string;
  label: string;
  yearSemLabel: string;
  groupId: number | string;
  columns: number[];
}

export interface LecturerInfo {
  abbr: string;
  name: string;
  email: string;
}

export interface SectionSchedule {
  id: string;
  label: string;
  yearSemLabel: string;
  groupId: number | string;
  entries: ScheduleEntry[];
}

export interface ScheduleData {
  sourceUrl: string;
  sections: SectionSchedule[];
  lecturers: LecturerInfo[];
}
