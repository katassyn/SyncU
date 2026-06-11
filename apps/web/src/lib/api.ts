/**
 * Cienki klient API dla SyncU backendu.
 *
 * Endpointy uzywane:
 *  - GET /timetable/week?date=YYYY-MM-DD -> WeekSchedule (sessions + courses)
 *  - GET /schedule/groups                -> lista grup z xls (live scrape, dla /import)
 *  - GET /schedule/group/:groupId        -> pelny plan grupy (live scrape, dla /import preview)
 *
 * Backend kod w `apps/api/src/handlers/timetable/index.ts` i
 * `apps/api/src/handlers/schedule/index.ts`.
 */

import type { ScheduleData, WeekSchedule } from '@syncu/types'
import { getStoredToken, clearToken } from './auth'

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

export type GroupSummary = {
  id: string
  label: string
  yearSemLabel: string
  groupId: number | string
}

export type GroupsResponse = {
  groups: GroupSummary[]
  sourceUrl: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ': ' + text : ''}`)
  }
  return (await res.json()) as T
}

/** Request z naglowkiem Authorization: Bearer (dla chronionych endpointow). */
function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  return request<T>(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

/**
 * G-5.3: Plan tygodnia z bazy (sessions zaimportowanych przez /timetable/import/confirm).
 * `date` w formacie YYYY-MM-DD - dowolny dzien wewnatrz tygodnia, backend sam liczy granice.
 */
export function fetchWeekSchedule(date: string): Promise<WeekSchedule> {
  return request<WeekSchedule>(`/timetable/week?date=${encodeURIComponent(date)}`)
}

export function fetchGroups(): Promise<GroupsResponse> {
  return request<GroupsResponse>('/schedule/groups')
}

/** Backend uzywa group prefix (np. "12") do dopasowania wszystkich podgrup ("12_1", "12_2"). */
export function fetchGroupSchedule(groupId: string): Promise<ScheduleData> {
  return request<ScheduleData>(`/schedule/group/${encodeURIComponent(groupId)}`)
}

export type ScheduleChangeRecord = {
  id: number
  scheduleId: string
  changeType: 'added' | 'removed' | 'modified'
  changedAt: string
  prevDataJson: string | null
}

export type ScheduleChangesResponse = {
  count: number
  changes: ScheduleChangeRecord[]
}

export function fetchScheduleChanges(groupId: string): Promise<ScheduleChangesResponse> {
  return request<ScheduleChangesResponse>(`/schedule/changes?groupId=${encodeURIComponent(groupId)}`)
}

/* --- import planu (G-5.6) --- */

export type ConfirmImportBody = {
  user: {
    email: string
    displayName: string
    university?: string | null
    fieldOfStudy?: string | null
    yearOfStudy?: number | null
  }
  semester: {
    name: string
    academicYear: string
    term: string
    startsAt?: string | null
    endsAt?: string | null
    isActive?: boolean
  }
  source: {
    kind: string
    url?: string | null
    filename?: string | null
  }
  section: {
    id: string
    label: string
    yearSemLabel: string
    groupId: number | string
    entries: Array<{ time: string; date: string; subject: string }>
  }
}

export type ConfirmImportResponse = {
  courseCount: number
  classSessionCount: number
}

/** POST /timetable/import/confirm - persystencja sparsowanego planu w bazie. */
export function confirmTimetableImport(body: ConfirmImportBody): Promise<ConfirmImportResponse> {
  return request<ConfirmImportResponse>('/timetable/import/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/* --- kolokwia (G-8 / G-12) --- */

export type ExamRecord = {
  id: number
  groupId: string
  createdBy: number
  courseId: number
  courseName: string
  date: string // ISO datetime
  scope: string | null
  createdAt: string
}

export type ExamsResponse = {
  exams: ExamRecord[]
}

/** GET /exams - kolokwia grupy zalogowanego usera (wymaga tokenu). */
export function fetchExams(): Promise<ExamsResponse> {
  return authedRequest<ExamsResponse>('/exams')
}

export type CreateExamInput = {
  courseId: number
  /** ISO date-time (np. z `new Date(...).toISOString()`). */
  date: string
  scope?: string | null
}

export type CreateExamResponse = {
  exam: ExamRecord
}

/**
 * POST /exams - utworz nowe kolokwium (wymaga tokenu).
 * Backend (apps/api/src/handlers/exams/index.ts) waliduje, ze `courseId`
 * nalezy do przedmiotow zalogowanego usera (semesters.userId = me).
 */
export function createExam(input: CreateExamInput): Promise<CreateExamResponse> {
  return authedRequest<CreateExamResponse>('/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/* --- przedmioty usera --- */

export type CourseSummary = {
  id: number
  name: string
  semesterId: number
}

/** GET /courses - przedmioty zalogowanego usera (do pickera kolokwiow). */
export function fetchCourses(): Promise<{ courses: CourseSummary[] }> {
  return authedRequest<{ courses: CourseSummary[] }>('/courses')
}

export type CourseSession = {
  id: number
  sessionType: string
  title: string
  startsAt: string
  endsAt: string
  room: string | null
  lecturerName: string | null
}

export type CourseDetail = {
  course: {
    id: number
    name: string
    semesterId: number
    lecturerName: string | null
    room: string | null
  }
  sessions: CourseSession[]
  exams: Array<{
    id: number
    date: string
    scope: string | null
    createdAt: string
  }>
}

/** GET /courses/:id - szczegoly przedmiotu (zajecia + kolokwia). 404 jesli nie moj. */
export function fetchCourseDetail(id: number): Promise<CourseDetail> {
  return authedRequest<CourseDetail>(`/courses/${id}`)
}

/* --- wlasne wydarzenia w planie --- */

export type UserEventRecord = {
  id: number
  userId: number
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  room: string | null
  createdAt: string
}

export function fetchMyEvents(): Promise<{ events: UserEventRecord[] }> {
  return authedRequest<{ events: UserEventRecord[] }>('/events')
}

export type CreateEventInput = {
  title: string
  date: string
  startTime: string
  endTime: string
  room?: string | null
}

export function createEvent(input: CreateEventInput): Promise<{ event: UserEventRecord }> {
  return authedRequest<{ event: UserEventRecord }>('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteEvent(id: number): Promise<{ deleted: boolean }> {
  return authedRequest<{ deleted: boolean }>(`/events/${id}`, { method: 'DELETE' })
}

export const USER_EVENTS_SECTION_ID = '__user-events__'

/**
 * Plan grupy + wlasne wydarzenia usera zmergowane jako syntetyczna sekcja.
 * Dzieki temu Today/Week pokazuja eventy bez zmian w logice renderowania
 * (obie strony robia flatMap po sections->entries).
 * Format wpisu dopasowany do planu PK: date "D.MM", time "H.MM-H.MM".
 */
export async function fetchScheduleWithMyEvents(groupId: string): Promise<ScheduleData> {
  const token = getStoredToken()
  const [schedule, eventsRes] = await Promise.all([
    fetchGroupSchedule(groupId),
    token
      ? fetchMyEvents().catch(() => ({ events: [] as UserEventRecord[] }))
      : Promise.resolve({ events: [] as UserEventRecord[] }),
  ])

  if (eventsRes.events.length === 0) return schedule

  const entries = eventsRes.events.map((event) => ({
    date: isoDateToDDMM(event.date),
    time: `${colonTimeToDot(event.startTime)}-${colonTimeToDot(event.endTime)}`,
    subject: event.room ? `${event.title} (${event.room})` : event.title,
  }))

  return {
    ...schedule,
    sections: [
      ...schedule.sections,
      {
        id: USER_EVENTS_SECTION_ID,
        label: 'Moje wydarzenia',
        yearSemLabel: '',
        groupId: '',
        entries,
      },
    ],
  }
}

/** "2026-06-07" -> "7.06" (format dat w planie PK: dzien bez zera, miesiac z zerem). */
function isoDateToDDMM(isoDate: string): string {
  const [, month = '', day = ''] = isoDate.split('-')
  return `${Number(day)}.${month}`
}

/** "09:30" -> "9.30" (format czasu w planie PK: kropka, godzina bez zera). */
function colonTimeToDot(time: string): string {
  const [h = '0', m = '00'] = time.split(':')
  return `${Number(h)}.${m}`
}

/* --- G-13: grupa (czlonkowie + wspolne kolokwia) --- */

export type GroupMember = {
  id: number
  displayName: string
  fieldOfStudy: string | null
  yearOfStudy: number | null
}

export type GroupMembersResponse = {
  groupId: string
  members: GroupMember[]
}

/** GET /groups/members - czlonkowie grupy zalogowanego usera. */
export function fetchGroupMembers(): Promise<GroupMembersResponse> {
  return authedRequest<GroupMembersResponse>('/groups/members')
}

export type GroupExamRecord = ExamRecord & {
  authorName: string
}

/** GET /exams - kolokwia wszystkich czlonkow mojej grupy (z autorem). */
export function fetchGroupExams(): Promise<{ exams: GroupExamRecord[] }> {
  return authedRequest<{ exams: GroupExamRecord[] }>('/exams')
}

/* --- G-14: materialy grupy --- */

export type MaterialRecord = {
  id: number
  groupId: string
  courseName: string
  title: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: number
  createdAt: string
  authorName: string
}

/** Url materialu do <a href>: wgrane pliki (/files/...) servuje API. */
export function materialHref(fileUrl: string): string {
  return fileUrl.startsWith('/files/') ? `${API_BASE}${fileUrl}` : fileUrl
}

export function fetchMaterials(course?: string): Promise<{ groupId: string; materials: MaterialRecord[] }> {
  const query = course ? `?course=${encodeURIComponent(course)}` : ''
  return authedRequest<{ groupId: string; materials: MaterialRecord[] }>(`/materials${query}`)
}

export type UploadMaterialInput = {
  file: File
  title?: string
  courseName: string
}

/**
 * POST /materials - material z plikiem (multipart, max 10 MB).
 * Content-Type ustawia przegladarka (boundary), wiec nie przechodzi przez
 * JSON-owy authedRequest helper.
 */
export function uploadMaterial(input: UploadMaterialInput): Promise<{ material: MaterialRecord }> {
  const formData = new FormData()
  formData.append('file', input.file)
  if (input.title) formData.append('title', input.title)
  formData.append('courseName', input.courseName)

  return authedRequest<{ material: MaterialRecord }>('/materials', {
    method: 'POST',
    body: formData,
  })
}

export function deleteMaterial(id: number): Promise<{ deleted: boolean }> {
  return authedRequest<{ deleted: boolean }>(`/materials/${id}`, { method: 'DELETE' })
}
