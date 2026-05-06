import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScheduleEntry } from '@syncu/types'
import { Button, Card } from '@syncu/ui'
import { fetchGroupSchedule, fetchGroups, type GroupSummary } from '../lib/api'
import { PageShell } from './PageShell'

/**
 * G-3 #1 + "Today fancy" (po revertcie do /schedule/*):
 *
 * Pokazujemy 3 najblizsze nadchodzace zajecia ze wspolnego planu PK
 * (z `/schedule/group/:id`), filtrujac wpisy ktorych start >= teraz.
 *
 * Zrodlo: identyczne jak w /week (publiczny plan auto-wypelniany przez backend
 * z PK URL). Wybor grupy synchronizujemy z localStorage `syncu.selectedGroup`,
 * ktory zapisuje /week.
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

type State =
  | { kind: 'loading' }
  | { kind: 'noGroup' } // grup nie ma w ogole na backendzie
  | { kind: 'loaded'; entries: UpcomingEntry[] }
  | { kind: 'error'; message: string }

type UpcomingEntry = ScheduleEntry & {
  startsAt: Date
  endsAt: Date
}

export default function Today() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const now = new Date()

    fetchGroups()
      .then(async (groupsRes) => {
        if (cancelled) return
        if (groupsRes.groups.length === 0) {
          setState({ kind: 'noGroup' })
          return
        }
        const stored = readStoredGroup(groupsRes.groups)
        // Default = pierwsza podgrupa po sortowaniu (rocznik/grupa/podgrupa)
        const sortedFirst = [...groupsRes.groups].sort((a, b) => {
          const ag = Number(a.groupId)
          const bg = Number(b.groupId)
          if (ag !== bg) return ag - bg
          return a.id.localeCompare(b.id)
        })[0]
        const selected = stored ?? sortedFirst.id
        const data = await fetchGroupSchedule(selected)
        if (cancelled) return

        const upcoming = pickUpcoming(
          data.sections.flatMap((s) => s.entries),
          now,
          3,
        )
        setState({ kind: 'loaded', entries: upcoming })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Nieznany blad',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PageShell
      title="Today"
      subtitle="Najblizsze zajecia + kolokwia + zadania nauki"
    >
      {state.kind === 'loading' && (
        <p className="text-muted">Ladowanie...</p>
      )}

      {state.kind === 'error' && (
        <Card
          variant="surface"
          padding="md"
          className="border border-danger/40 bg-danger/5"
        >
          <p className="text-danger font-semibold mb-1">Blad</p>
          <p className="text-muted text-ui">{state.message}</p>
        </Card>
      )}

      {state.kind === 'noGroup' && (
        <EmptyState
          headline="Nie ma planu do wyswietlenia"
          message="Backend nie zwrocil zadnych grup. Sprobuj zaimportowac wlasny plan."
          onImport={() => navigate('/import')}
        />
      )}

      {state.kind === 'loaded' && state.entries.length === 0 && (
        <EmptyState
          headline="Brak zaplanowanych zajec"
          message="Nie masz juz zajec w biezacym tygodniu. Sprawdz pelny plan w widoku Week."
          onImport={() => navigate('/week')}
          ctaLabel="Pelny plan tygodnia"
        />
      )}

      {state.kind === 'loaded' && state.entries.length > 0 && (
        <UpcomingList entries={state.entries} />
      )}
    </PageShell>
  )
}

/* --- helpers --- */

function readStoredGroup(groups: GroupSummary[]): string | null {
  try {
    const v = localStorage.getItem(LS_GROUP_KEY)
    if (!v) return null
    return groups.some((g) => g.id === v) ? v : null
  } catch {
    return null
  }
}

/**
 * Bierze entries (PK format: date "DD.MM", time "8.00-10.30"), dopasowuje rok
 * (zakladajac rok biezacy / nastepny dla daty bliskiej Stycznia), filtruje
 * `startsAt >= now`, sortuje i zwraca top N.
 */
function pickUpcoming(
  entries: ScheduleEntry[],
  now: Date,
  limit: number,
): UpcomingEntry[] {
  const upcoming: UpcomingEntry[] = []

  for (const entry of entries) {
    const startsAt = parseEntryDateTime(entry.date, entry.time, 'start', now)
    const endsAt = parseEntryDateTime(entry.date, entry.time, 'end', now)
    if (!startsAt || !endsAt) continue
    if (startsAt.getTime() < now.getTime()) continue
    upcoming.push({ ...entry, startsAt, endsAt })
  }

  upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  return upcoming.slice(0, limit)
}

function parseEntryDateTime(
  ddmm: string,
  timeRange: string,
  which: 'start' | 'end',
  now: Date,
): Date | null {
  // ddmm = "17.03"
  const dateMatch = ddmm.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (!dateMatch) return null
  const day = Number(dateMatch[1])
  const month = Number(dateMatch[2])

  const parts = timeRange.split('-').map((s) => s.trim())
  const timePart = which === 'start' ? parts[0] : parts[1]
  if (!timePart) return null
  const tMatch = timePart.match(/^(\d{1,2})[.:](\d{1,2})$/)
  if (!tMatch) return null
  const hour = Number(tMatch[1])
  const minute = Number(tMatch[2])

  // Heurystyka roku: zakladamy biezacy rok; jezeli data wypadnie w przeszlosci
  // wzgledem dzisiaj o wiecej niz 6 miesiecy, prawdopodobnie chodzi o nastepny rok.
  const year = pickYear(month, day, now)
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function pickYear(month: number, day: number, now: Date): number {
  const candidate = new Date(now.getFullYear(), month - 1, day)
  const diffMonths =
    (candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (diffMonths < -6) return now.getFullYear() + 1
  return now.getFullYear()
}

const DAY_NAMES = [
  'Niedziela',
  'Poniedzialek',
  'Wtorek',
  'Sroda',
  'Czwartek',
  'Piatek',
  'Sobota',
]

function dayLabel(d: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0) return 'Dzis'
  if (diff === 1) return 'Jutro'
  if (diff > 1 && diff < 7) return DAY_NAMES[d.getDay()]
  const day = d.getDate()
  const month = d.getMonth() + 1
  return `${day}.${month < 10 ? '0' + month : month}`
}

function formatHM(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`
}

/* --- subkomponenty --- */

function UpcomingList({ entries }: { entries: UpcomingEntry[] }) {
  const now = new Date()
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-h3 text-heading font-semibold">
        Najblizsze zajecia ({entries.length})
      </h2>
      {entries.map((e, i) => (
        <Card
          key={`${e.date}-${e.time}-${i}`}
          variant="white"
          padding="md"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h3 className="text-h3 text-heading font-semibold">{e.subject}</h3>
            <span className="text-caption text-muted uppercase tracking-label">
              {dayLabel(e.startsAt, now)} · {formatHM(e.startsAt)}–{formatHM(e.endsAt)}
            </span>
          </div>
          <p className="text-ui text-muted">{e.date}</p>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({
  headline,
  message,
  onImport,
  ctaLabel = 'Zaimportuj plan',
}: {
  headline: string
  message: string
  onImport: () => void
  ctaLabel?: string
}) {
  return (
    <Card variant="surface" padding="lg" className="text-center">
      <h2 className="text-h2 text-heading font-semibold mb-2">{headline}</h2>
      <p className="text-muted mb-6 max-w-md mx-auto">{message}</p>
      <Button variant="primary" size="md" onClick={onImport}>
        {ctaLabel}
      </Button>
    </Card>
  )
}
