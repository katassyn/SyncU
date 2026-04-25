/**
 * Cienki klient API dla SyncU backendu.
 *
 * Endpointy uzywane:
 *  - GET /schedule/groups          -> lista grup ktore parser wykryl w xls
 *  - GET /schedule/group/:groupId  -> pelny plan grupy (sections + lecturers)
 *
 * Backend live na origin/main, kod w `apps/api/src/handlers/schedule/index.ts`.
 */

import type { ScheduleData } from '@syncu/types'

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

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ': ' + text : ''}`)
  }
  return (await res.json()) as T
}

export function fetchGroups(): Promise<GroupsResponse> {
  return request<GroupsResponse>('/schedule/groups')
}

/** Backend uzywa group prefix (np. "12") do dopasowania wszystkich podgrup ("12_1", "12_2"). */
export function fetchGroupSchedule(groupId: string): Promise<ScheduleData> {
  return request<ScheduleData>(`/schedule/group/${encodeURIComponent(groupId)}`)
}
