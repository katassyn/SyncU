import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClassSession, Course, WeekSchedule } from '@syncu/types'
import { Button, Card } from '@syncu/ui'
import { fetchWeekSchedule } from '../lib/api'
import { formatYMD } from '../lib/week'
import { PageShell } from './PageShell'

/**
 * G-3 #1 + "Today fancy":
 *  - Fetch planu biezacego tygodnia z GET /timetable/week
 *  - Filtruje sessions ktore JESZCZE NIE ROZPOCZELY (>= now)
 *  - Pokazuje top 3 najblizsze
 *  - Empty state z CTA na /import gdy plan nie zostal zaimportowany albo
 *    biezacy tydzien jest pusty (zaocznie - typowy przypadek)
 *
 * G-8.5 (kolokwia / countdown) bedzie sekcja PONIZEJ - na razie kosci nie ruszam.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; sessions: EnrichedSession[] }
  | { kind: 'error'; message: string }

type EnrichedSession = ClassSession & { course?: Course }

export default function Today() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const now = new Date()
    fetchWeekSchedule(formatYMD(now))
      .then((data) => {
        if (cancelled) return
        const upcoming = filterUpcoming(data, now).slice(0, 3)
        setState({ kind: 'loaded', sessions: upcoming })
      })
      .catch((err) => {
        if (cancelled) return
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Nieznany blad',
        })
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

      {state.kind === 'loaded' && state.sessions.length === 0 && (
        <EmptyState onImport={() => navigate('/import')} />
      )}

      {state.kind === 'loaded' && state.sessions.length > 0 && (
        <UpcomingSessions sessions={state.sessions} />
      )}
    </PageShell>
  )
}

/* --- helpers --- */

function filterUpcoming(data: WeekSchedule, now: Date): EnrichedSession[] {
  const coursesById = new Map<number, Course>(
    data.courses.map((c) => [c.id, c]),
  )
  return data.sessions
    .filter((s) => new Date(s.startsAt).getTime() >= now.getTime())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((s) => ({ ...s, course: coursesById.get(s.courseId) }))
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

function UpcomingSessions({ sessions }: { sessions: EnrichedSession[] }) {
  const now = new Date()
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-h3 text-heading font-semibold">
        Najblizsze zajecia ({sessions.length})
      </h2>
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} now={now} />
      ))}
    </div>
  )
}

function SessionCard({
  session,
  now,
}: {
  session: EnrichedSession
  now: Date
}) {
  const start = new Date(session.startsAt)
  const end = new Date(session.endsAt)
  const title = session.title || session.course?.name || 'Zajecia'
  const room = session.room ?? session.course?.room ?? null
  const lecturer = session.lecturerName ?? session.course?.lecturerName ?? null
  const teamsLink = session.course?.meetingLink ?? null

  return (
    <Card variant="white" padding="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-h3 text-heading font-semibold">{title}</h3>
        <span className="text-caption text-muted uppercase tracking-label">
          {dayLabel(start, now)} · {formatHM(start)}–{formatHM(end)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-ui text-muted">
        {room && (
          <span>
            <strong className="text-body">Sala:</strong> {room}
          </span>
        )}
        {lecturer && (
          <span>
            <strong className="text-body">Prowadzacy:</strong> {lecturer}
          </span>
        )}
        {teamsLink && (
          <a
            href={teamsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary-dark"
          >
            Teams
          </a>
        )}
      </div>
    </Card>
  )
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <Card variant="surface" padding="lg" className="text-center">
      <h2 className="text-h2 text-heading font-semibold mb-2">
        Brak zaplanowanych zajec
      </h2>
      <p className="text-muted mb-6 max-w-md mx-auto">
        W biezacym tygodniu nie ma juz zajec, albo plan nie zostal jeszcze
        zaimportowany.
      </p>
      <Button variant="primary" size="md" onClick={onImport}>
        Zaimportuj plan
      </Button>
    </Card>
  )
}
