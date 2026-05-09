import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClassSessionType, ScheduleData, WeekEvent } from '@syncu/types'
import { normalize } from '@syncu/core'
import { Button, Card } from '@syncu/ui'
import { fetchGroupSchedule, fetchGroups, type GroupSummary } from '../lib/api'
import { addDays, formatDDMM, startOfWeek } from '../lib/week'
import { WeekDatePicker } from '../components/WeekDatePicker'
import { WeekGrid } from '../components/WeekGrid'
import { PageShell } from './PageShell'

/**
 * G-4 + G-5.5 (po reverse): /week jako publiczny widok planu PK.
 *
 * Zrodlo danych:
 *  - GET /schedule/groups          - lista grup (cron na backendzie scrapuje
 *                                    PK i wypelnia DB)
 *  - GET /schedule/group/:groupId  - pelny plan grupy (sections + entries)
 *
 * /timetable/week (per-user import) NIE jest tu uzywany - to oddzielny feature
 * pod logowanie + import z xlsx, na pozniejsze tygodnie (G-5.6 + G-6).
 *
 * Wybor grupy zapamietujemy w localStorage zeby nie pytac za kazdym razem.
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

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

export default function Week() {
  const [state, setState] = useState<State>({ kind: 'loadingGroups' })
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const navigate = useNavigate()

  // 1) Najpierw pobieramy liste grup
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
        // Default = pierwsza podgrupa (sortowana - najnizsza w hierarchii)
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

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // Spluszczamy entries ze wszystkich subgrup wybranej grupy
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

  return (
    <PageShell title="Week" subtitle="Plan zajec na tydzien">
      {state.kind === 'loadingGroups' && (
        <p className="text-muted">Ladowanie listy grup...</p>
      )}

      {state.kind === 'error' && !state.groups && (
        <Card
          variant="surface"
          padding="md"
          className="border border-danger/40 bg-danger/5 mb-4"
        >
          <p className="text-danger font-semibold mb-1">Blad</p>
          <p className="text-muted text-ui">{state.message}</p>
        </Card>
      )}

      {(state.kind === 'loadingSchedule' ||
        state.kind === 'loaded' ||
        (state.kind === 'error' && state.groups)) && (
        <>
          <GroupSelector
            groups={state.groups!}
            selected={state.selected!}
            onChange={(g) => {
              writeStoredGroup(g)
              loadSchedule(g, state.groups!, setState)
            }}
          />
          <WeekDatePicker weekStart={weekStart} onChange={setWeekStart} />

          {state.kind === 'loadingSchedule' && (
            <p className="text-muted">Ladowanie planu grupy...</p>
          )}

          {state.kind === 'error' && (
            <Card
              variant="surface"
              padding="md"
              className="border border-danger/40 bg-danger/5 mb-4"
            >
              <p className="text-danger font-semibold mb-1">Blad</p>
              <p className="text-muted text-ui mb-3">{state.message}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  loadSchedule(state.selected!, state.groups!, setState)
                }
              >
                Sprobuj ponownie
              </Button>
            </Card>
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

/**
 * Zgaduje typ zajec z tekstu pola "subject" w xls'u PK.
 * Format od PK to plain string typu:
 *   "WdPAI lab. AWid s. 114 GIL"
 *   "Programowanie interfejsow graficznych wyklad dr hab. inz. ..."
 *   "Projekt zespolowy P TG s. 131"
 *   "Inzynieria oprogramowania cw. ..."
 * Bez tego mapowania wszystko renderuje sie jako "lecture" - dlatego badge
 * w ScheduleCard pokazywal "WYKLAD" dla labow.
 */
function inferSessionType(subject: string): ClassSessionType {
  // normalize z @syncu/core: lowercase + strip polskich znakow + collapse whitespace.
  // "Programowanie wykład dr hab. ..." -> "programowanie wyklad dr hab. ..."
  const s = normalize(subject)
  // kolejnosc ma znaczenie: "egzamin" wpierw, potem "lab", "projekt", itd.
  if (/\begzamin\b/.test(s)) return 'exam'
  if (/\blab\b|\blab\.|laboratorium/.test(s)) return 'lab'
  if (/\bprojekt\b/.test(s)) return 'project'
  if (/\bcw\b|\bcw\.|cwiczenia|seminarium|seminar/.test(s)) return 'seminar'
  if (/\bwyklad\b|\bwyk\b|\bwyk\./.test(s)) return 'lecture'
  // Default: jezeli plan PK nie podaje typu, jest to typowo wyklad.
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
    .then((data) => {
      setState({ kind: 'loaded', groups, selected: groupId, data })
    })
    .catch((err) => {
      setState({
        kind: 'error',
        groups,
        selected: groupId,
        message: err instanceof Error ? err.message : 'Nieznany blad',
      })
    })
}

function readStoredGroup(groups: GroupSummary[]): string | null {
  try {
    const v = localStorage.getItem(LS_GROUP_KEY)
    if (!v) return null
    // Storage trzyma teraz pelne id podgrupy (np. "31_1"). Backward compat:
    // jezeli ktos ma stare "31", traktujemy jako brak (uzytkownik dostanie
    // pierwsza podgrupe i moze sobie wybrac wlasciwa).
    const exists = groups.some((g) => g.id === v)
    return exists ? v : null
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
  // Pokazujemy KAZDA podgrupe osobno (np. 31_1 i 31_2 jako oddzielne opcje),
  // bo backend matchuje po prefiksie - jak wyslemy "31" to dostaniemy MIX
  // wszystkich podgrup, czyli zajecia obu labow.
  // Sortujemy: po groupId numerycznie (11/12 -> rok 1, 21/22 -> rok 2, ...),
  // potem leksykalnie po pelnym id (31_1 przed 31_2).
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

/**
 * Empty state - "W tym tygodniu nie ma zajec".
 * Plan zaoczny obejmuje tylko wybrane weekendy, wiec pusty tydzien to
 * normalna sytuacja - primary action = nawigacja, import jako sekundarna
 * podpowiedz dla osob ktore chca uzyc swojego pliku xlsx.
 */
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
