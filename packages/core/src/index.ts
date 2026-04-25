export {
  importTimetable,
  fillMerges,
  discoverSections,
  extractEntries,
  parseLegend,
  excelDateToJSDate,
} from './timetable/parser'

export type {
  ScheduleEntry,
  ScheduleSection,
  LecturerInfo,
  ParsedTimetable,
} from './timetable/types'
