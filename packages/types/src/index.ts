export interface ScheduleEntry {
  time: string;
  date: string;
  subject: string;
}

export interface SectionConfig {
  id: string;
  label: string;
  yearSemLabel: string;
  groupId: number;
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
  groupId: number;
  entries: ScheduleEntry[];
}

export interface ScheduleData {
  sourceUrl: string;
  sections: SectionSchedule[];
  lecturers: LecturerInfo[];
}
