import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { ClassSessionType, ScheduleData, ScheduleEntry, WeekEvent } from '@syncu/types'
import { normalize } from '@syncu/core'
import { Button, Card } from '@syncu/ui'
import { fetchGroupSchedule, fetchGroups, type GroupSummary } from '../lib/api'
import { addDays, formatDDMM, startOfWeek } from '../lib/week'
import { ChangeNotice } from '../components/ChangeNotice'
import { WeekDatePicker } from '../components/WeekDatePicker'
import { WeekGrid } from '../components/WeekGrid'
import { PageShell } from './PageShell'

const LS_GROUP_KEY = 'syncu.selectedGroup'

type View = 'day' | 'week'

type State =
  | { kind: 'loadingGroups' }
  | { kind: 'loadingSchedule'; groups: GroupSummary[]; selected: string }
  | {
      kind: 'loaded'
      groups: GroupSummary[]
      selected: string
      data: ScheduleData
    }
  | {
      kind: 'error'
      message: string
      groups?: GroupSummary[]
      selected?: string
    }

function dayStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function Week() {
  const [view, setView] = useState<View>('week')
  const [state, setState] = useState<State>({ kind: 'loadingGroups' })
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date>(() => dayStart())
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    fetchGroups()
      .then((res) => {
        if (cancelled) return
        if (res.groups.length === 0) {
          setState({
            kind: 'error',
            message: 'Backend nie zwrocil zadnych grup. Czy plan PK jest dostepny?',
          })
          return
        }
        const stored = readStoredGroup(res.groups)
        const sortedFirst = [...res.groups].sort((a, b) => {
          const ag = Number(a.groupId)
          const bg = Number(b.groupId)
          if (ag !== bg) return ag - bg
          return a.id.localeCompare(b.id)
        })[0]
        const selected = stored ?? sortedFirst.id
        loadSchedule(selected, res.groups, setState)
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

  // --- week view ---
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  const events = useMemo((): WeekEvent[] => {
    if (state.kind !== 'loaded') return []
    const entries = state.data.sections.flatMap((s) => s.entries)
    return entries.flatMap((entry, idx) => {
      const day = weekDates.findIndex((d) => formatDDMM(d) === entry.date)
      if (day === -1) return []
      const { start, end } = parseTimeRange(entry.time)
      return [{
        id: idx,
        title: entry.subject,
        type: inferSessionType(entry.subject),
        day: day as WeekEvent['day'],
        startTime: start,
        endTime: end,
      }]
    })
  }, [state, weekDates])

  const isEmpty = state.kind === 'loaded' && events.length === 0

  // --- day view ---
  const today = useMemo(() => dayStart(), [])
  const isToday = selectedDate.getTime() === today.getTime()

  const dayEntries = useMemo((): ScheduleEntry[] => {
    if (state.kind !== 'loaded') return []
    const ddmm = formatDDMM(selectedDate)
    return state.data.sections
      .flatMap((s) => s.entries)
      .filter((e) => e.date === ddmm)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [state, selectedDate])

  const hasData =
    state.kind === 'loadingSchedule' ||
    state.kind === 'loaded' ||
    (state.kind === 'error' && state.groups)

  return (
    <PageShell title="Plan zajęć" subtitle={view === 'day' ? 'Widok dzienny' : 'Widok tygodniowy'}>

      {/* Toggle Dziś / Tydzień */}
      <div className="flex gap-1 mb-6">
        {(['day', 'week'] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={[
              'px-4 py-2 rounded-pill text-ui font-medium transition-colors cursor-pointer',
              view === v
                ? 'bg-primary text-on-primary'
                : 'bg-surface-1 text-heading hover:bg-surface-2',
            ].join(' ')}
          >
            {v === 'day' ? 'Dziś' : 'Tydzień'}
          </button>
        ))}
      </div>

      {/* Change notice */}
      {state.kind === 'loaded' && (
        <ChangeNotice groupId={state.selected} />
      )}

      {/* Error (no groups) */}
      {state.kind === 'error' && !state.groups && (
        <Card variant="surface" padding="md" className="border border-danger/40 bg-danger/5 mb-4">
          <p className="text-danger font-semibold mb-1">Blad</p>
          <p className="text-muted text-ui">{state.message}</p>
        </Card>
      )}

      {/* Group selector */}
      {hasData && (
        <GroupSelector
          groups={state.groups!}
          selected={state.selected!}
          onChange={(g) => {
            writeStoredGroup(g)
            loadSchedule(g, state.groups!, setState)
          }}
        />
      )}

      {/* ── Day view ── */}
      {view === 'day' && (
        <>
          <DayNav
            date={selectedDate}
            isToday={isToday}
            onPrev={() => setSelectedDate((d) => addDays(d, -1))}
            onNext={() => setSelectedDate((d) => addDays(d, 1))}
            onToday={() => setSelectedDate(dayStart())}
          />

          {(state.kind === 'loadingGroups' || state.kind === 'loadingSchedule') && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-card-sm bg-surface-1 animate-pulse" />
              ))}
            </div>
          )}

          {state.kind === 'loaded' && dayEntries.length > 0 && (
            <div className="flex flex-col gap-3">
              {dayEntries.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-3 rounded-card-sm bg-white shadow-card-sm border-l-[3px] border-primary"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-badge text-muted block mb-1">{e.time}</span>
                    <p className="text-body font-semibold text-heading m-0 truncate">{e.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {state.kind === 'loaded' && dayEntries.length === 0 && (
            <Card variant="surface" padding="lg" className="text-center">
              <p className="text-heading font-semibold mb-2">Brak zajęć</p>
              <p className="text-muted text-ui">
                W tym dniu nie ma zajęć.{' '}
                <NavLink to="/import" className="text-primary-nav font-semibold hover:underline">
                  Zaimportuj plan
                </NavLink>
                .
              </p>
            </Card>
          )}
        </>
      )}

      {/* ── Week view ── */}
      {view === 'week' && (
        <>
          {state.kind === 'loadingGroups' && (
            <p className="text-muted">Ladowanie listy grup...</p>
          )}

          {state.kind === 'error' && state.groups && (
            <Card variant="surface" padding="md" className="border border-danger/40 bg-danger/5 mb-4">
              <p className="text-danger font-semibold mb-1">Blad</p>
              <p className="text-muted text-ui mb-3">{state.message}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadSchedule(state.selected!, state.groups!, setState)}
              >
                Sprobuj ponownie
              </Button>
            </Card>
          )}

          <WeekDatePicker weekStart={weekStart} onChange={setWeekStart} />

          {state.kind === 'loadingSchedule' && (
            <p className="text-muted">Ladowanie planu grupy...</p>
          )}

          {isEmpty && (
            <EmptyWeekState
              onPrev={() => setWeekStart(addDays(weekStart, -7))}
              onNext={() => setWeekStart(addDays(weekStart, 7))}
              onImport={() => navigate('/import')}
            />
          )}

          {state.kind === 'loaded' && events.length > 0 && (
            <WeekGrid events={events} weekDates={weekDates} />
          )}
        </>
      )}

    </PageShell>
  )
}

/* --- helpers --- */

function inferSessionType(subject: string): ClassSessionType {
  const s = normalize(subject)
  if (/\begzamin\b/.test(s)) return 'exam'
  if (/\blab\b|\blab\.|laboratorium/.test(s)) return 'lab'
  if (/\bprojekt\b/.test(s)) return 'project'
  if (/\bcw\b|\bcw\.|cwiczenia|seminarium|seminar/.test(s)) return 'seminar'
  if (/\bwyklad\b|\bwyk\b|\bwyk\./.test(s)) return 'lecture'
  return 'lecture'
}

function parseTimeRange(range: string): { start: string; end: string } {
  const [startRaw = '', endRaw = ''] = range.split('-').map((s) => s.trim())
  return { start: dotTimeToColon(startRaw), end: dotTimeToColon(endRaw) }
}

function dotTimeToColon(t: string): string {
  const [h = '0', m = '00'] = t.split('.')
  return `${String(Number(h)).padStart(2, '0')}:${m.padEnd(2, '0')}`
}

function loadSchedule(
  groupId: string,
  groups: GroupSummary[],
  setState: React.Dispatch<React.SetStateAction<State>>,
): void {
  setState({ kind: 'loadingSchedule', groups, selected: groupId })
  fetchGroupSchedule(groupId)
    .then((data) => setState({ kind: 'loaded', groups, selected: groupId, data }))
    .catch((err) =>
      setState({
        kind: 'error',
        groups,
        selected: groupId,
        message: err instanceof Error ? err.message : 'Nieznany blad',
      }),
    )
}

function readStoredGroup(groups: GroupSummary[]): string | null {
  try {
    const v = localStorage.getItem(LS_GROUP_KEY)
    if (!v) return null
    return groups.some((g) => g.id === v) ? v : null
  } catch {
    return null
  }
}

function writeStoredGroup(value: string): void {
  try {
    localStorage.setItem(LS_GROUP_KEY, value)
  } catch {
    // ignore (private mode itd.)
  }
}

/* --- subkomponenty --- */

function GroupSelector({
  groups,
  selected,
  onChange,
}: {
  groups: GroupSummary[]
  selected: string
  onChange: (g: string) => void
}) {
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const ag = Number(a.groupId)
      const bg = Number(b.groupId)
      if (ag !== bg) return ag - bg
      return a.id.localeCompare(b.id)
    })
  }, [groups])

  return (
    <label className="flex flex-col gap-1.5 mb-4 max-w-md">
      <span className="text-caption font-bold text-body tracking-label uppercase">
        Twoja grupa
      </span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors"
      >
        {sortedGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DayNav({
  date,
  isToday,
  onPrev,
  onNext,
  onToday,
}: {
  date: Date
  isToday: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const label = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Button type="button" variant="secondary" size="sm" onClick={onPrev} aria-label="Poprzedni dzień">
        ←
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onToday} disabled={isToday}>
        Dziś
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onNext} aria-label="Następny dzień">
        →
      </Button>
      <span className="ml-3 text-ui font-semibold text-heading capitalize">{label}</span>
    </div>
  )
}

function EmptyWeekState({
  onPrev,
  onNext,
  onImport,
}: {
  onPrev: () => void
  onNext: () => void
  onImport: () => void
}) {
  return (
    <Card variant="surface" padding="lg" className="text-center">
      <h2 className="text-heading text-h2 font-semibold mb-2">
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
      <button
        type="button"
        onClick={onImport}
        className="text-sm text-muted underline hover:text-primary"
      >
        Chcesz wgrac wlasny plik .xlsx? Idz do /import
      </button>
    </Card>
  )
}
