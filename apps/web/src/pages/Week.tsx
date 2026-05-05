import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { ClassSession, Course, WeekEvent, WeekSchedule } from '@syncu/types'
import { Card, Button } from '@syncu/ui'
import { fetchWeekSchedule } from '../lib/api'
import { addDays, formatYMD, startOfWeek } from '../lib/week'
import { WeekDatePicker } from '../components/WeekDatePicker'
import { WeekGrid } from '../components/WeekGrid'
import { PageShell } from './PageShell'

/**
 * G-5.3: Strona /week - WeekGrid podpiety pod GET /timetable/week.
 *
 * Backend (apps/api/src/handlers/timetable/index.ts) filtruje sessions po
 * active semester i tygodniu. Zrodlo danych: tabela `class_sessions` zasilana
 * importem (POST /timetable/import/confirm). Jezeli plan nie zostal jeszcze
 * zaimportowany, sessions = [] -> pokazujemy empty state z CTA na /import.
 *
 * Wybor grupy nie jest juz potrzebny - backend wie kogo dotyczy plan
 * (po seminarze docelowo per-user, na razie globalnie po active semester).
 */

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; data: WeekSchedule }
  | { kind: 'error'; message: string }

export default function Week() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // Fetch przy zmianie weekStart
  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    fetchWeekSchedule(formatYMD(weekStart))
      .then((data) => {
        if (!cancelled) setState({ kind: 'loaded', data })
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
  }, [weekStart])

  const events = useMemo((): WeekEvent[] => {
    if (state.kind !== 'loaded') return []
    return mapSessionsToEvents(state.data)
  }, [state])

  const isEmpty = state.kind === 'loaded' && events.length === 0

  return (
    <PageShell title="Week" subtitle="Plan zajec na tydzien">
      <WeekDatePicker weekStart={weekStart} onChange={setWeekStart} />

      {state.kind === 'loading' && (
        <p className="text-muted">Ladowanie planu tygodnia...</p>
      )}

      {state.kind === 'error' && (
        <ErrorBox
          message={state.message}
          onRetry={() => setWeekStart(new Date(weekStart))}
        />
      )}

      {isEmpty && (
        <EmptyWeekState
          onPrev={() => setWeekStart(addDays(weekStart, -7))}
          onNext={() => setWeekStart(addDays(weekStart, 7))}
        />
      )}

      {state.kind === 'loaded' && events.length > 0 && (
        <WeekGrid events={events} weekDates={weekDates} />
      )}
    </PageShell>
  )
}

/* --- mapowanie sessions -> WeekEvent --- */

function mapSessionsToEvents(data: WeekSchedule): WeekEvent[] {
  const coursesById = new Map<number, Course>(
    data.courses.map((c) => [c.id, c]),
  )

  return data.sessions.map((s) => sessionToEvent(s, coursesById))
}

function sessionToEvent(
  s: ClassSession,
  coursesById: Map<number, Course>,
): WeekEvent {
  const start = new Date(s.startsAt)
  const end = new Date(s.endsAt)
  // JS getDay(): 0 = Nd, 1 = Pn, ..., 6 = Sob.
  // WeekGrid expectuje: 0 = Pn, 6 = Nd. Konwersja:
  const day = (((start.getDay() + 6) % 7)) as WeekEvent['day']
  const course = coursesById.get(s.courseId)

  return {
    id: s.id,
    title: s.title || course?.name || 'Zajecia',
    type: s.sessionType,
    day,
    startTime: formatHM(start),
    endTime: formatHM(end),
    room: s.room ?? course?.room ?? null,
    lecturer: s.lecturerName ?? course?.lecturerName ?? null,
    teamsLink: course?.meetingLink ?? null,
  }
}

function formatHM(d: Date): string {
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`
}

/* --- subkomponenty --- */

/**
 * G-5.5: Empty state - "W tym tygodniu nie ma zajec".
 *
 * Edge case dla planu zaocznego: NIE kazdy weekend ma zajecia (terminarz PK
 * obejmuje tylko wybrane soboty/niedziele). Ten stan to oczekiwana sytuacja,
 * a nie blad - dlatego primary action to nawigacja po tygodniach
 * (poprzedni/nastepny), a import planu jest sekundarna podpowiedzia
 * dla user'ow ktorzy jeszcze nic nie zaimportowali.
 */
function EmptyWeekState({
  onPrev,
  onNext,
}: {
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <Card variant="surface" padding="lg" className="text-center">
      <h2 className="text-heading text-xl font-semibold mb-2">
        W tym tygodniu nie ma zajec
      </h2>
      <p className="text-muted mb-6 max-w-md mx-auto">
        Plan studiow zaocznych nie obejmuje kazdego weekendu. Sprawdz sasiednie
        tygodnie - tam pewnie cos jest.
      </p>

      <div className="flex gap-2 justify-center mb-8 flex-wrap">
        <Button variant="secondary" size="md" onClick={onPrev}>
          ← Poprzedni tydzien
        </Button>
        <Button variant="secondary" size="md" onClick={onNext}>
          Nastepny tydzien →
        </Button>
      </div>

      <p className="text-sm text-muted">
        Nie zaimportowales jeszcze planu?{' '}
        <NavLink to="/import" className="text-primary underline hover:text-primary-dark">
          Wgraj go z Excela
        </NavLink>
      </p>
    </Card>
  )
}

function ErrorBox({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <Card
      variant="surface"
      padding="md"
      className="border border-danger/40 bg-danger/5 mb-4"
    >
      <p className="text-danger font-semibold mb-1">Blad</p>
      <p className="text-muted text-sm mb-3">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Sprobuj ponownie
      </Button>
    </Card>
  )
}
