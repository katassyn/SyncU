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
import { getStoredToken } from './auth'

const API_BASE: string =
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

/* --- kolokwia (G-8 / G-12) --- */

export type ExamRecord = {
  id: number
  userId: number
  courseId: number
  courseName: string
  date: string // ISO datetime
  scope: string | null
  createdAt: string
}

export type ExamsResponse = {
  exams: ExamRecord[]
}

/** GET /exams - kolokwia zalogowanego usera (wymaga tokenu). */
export function fetchExams(): Promise<ExamsResponse> {
  return authedRequest<ExamsResponse>('/exams')
}
