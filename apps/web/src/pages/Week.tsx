import { useEffect, useMemo, useState } from 'react'
import type { ScheduleData } from '@syncu/types'
import { fetchGroupSchedule, fetchGroups, type GroupSummary } from '../lib/api'
import { startOfWeek } from '../lib/week'
import { WeekDatePicker } from '../components/WeekDatePicker'
import { WeekGrid } from '../components/WeekGrid'
import { PageShell } from './PageShell'

/**
 * G-4 #2: Strona /week - WeekGrid podpiety pod GET /schedule/group/:groupId
 * + loading / error / empty states.
 *
 * Backend zwraca ScheduleData (sections + lecturers). Plaszczymy entries
 * ze wszystkich subgrup wybranej grupy do jednej listy i karmimy nia WeekGrid.
 *
 * Wybor grupy zapisujemy w localStorage zeby nie pytac za kazdym razem.
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

type State =
  | { kind: 'loadingGroups' }
  | { kind: 'noGroups'; reason: string }
  | { kind: 'loadingSchedule'; groups: GroupSummary[]; selected: string }
  | {
      kind: 'loaded'
      groups: GroupSummary[]
      selected: string
      data: ScheduleData
    }
  | {
      kind: 'error'
      groups: GroupSummary[]
      selected: string
      message: string
    }

export default function Week() {
  const [state, setState] = useState<State>({ kind: 'loadingGroups' })
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  // 1) Najpierw pobieramy liste grup
  useEffect(() => {
    let cancelled = false
    fetchGroups()
      .then((res) => {
        if (cancelled) return
        if (res.groups.length === 0) {
          setState({
            kind: 'noGroups',
            reason: 'Backend nie zwrocil zadnych grup. Czy plan PK jest dostepny?',
          })
          return
        }
        // Wybieramy domyslna grupe: ostatnio wybrana albo pierwsza z listy.
        // Backend matchuje po prefiksie (np. "12" -> "12_1", "12_2"),
        // wiec uzywamy `groupId` (numer) jako klucza, nie pelnego `id`.
        const stored = readStoredGroup(res.groups)
        const selected = stored ?? String(res.groups[0].groupId)
        loadSchedule(selected, res.groups, setState)
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            kind: 'noGroups',
            reason: err instanceof Error ? err.message : 'Nieznany blad',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 2) Spluszczone wpisy dla wybranej grupy (laczymy wszystkie subgrupy)
  const entries = useMemo(() => {
    if (state.kind !== 'loaded') return []
    return state.data.sections.flatMap((s) => s.entries)
  }, [state])

  return (
    <PageShell title="Week" subtitle="Plan zajec na tydzien">
      {state.kind === 'loadingGroups' && (
        <p style={{ color: '#6B7280' }}>Ladowanie listy grup...</p>
      )}

      {state.kind === 'noGroups' && (
        <ErrorBox>
          {state.reason}
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#6B7280' }}>
            Sprawdz, czy backend dziala (`bun run dev:api`) i ze API_URL ={' '}
            <code>{import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}</code>.
          </div>
        </ErrorBox>
      )}

      {(state.kind === 'loadingSchedule' ||
        state.kind === 'loaded' ||
        state.kind === 'error') && (
        <>
          <GroupSelector
            groups={state.groups}
            selected={state.selected}
            onChange={(g) => {
              writeStoredGroup(g)
              loadSchedule(g, state.groups, setState)
            }}
          />
          <WeekDatePicker weekStart={weekStart} onChange={setWeekStart} />

          {state.kind === 'loadingSchedule' && (
            <p style={{ color: '#6B7280' }}>Ladowanie planu grupy...</p>
          )}

          {state.kind === 'error' && (
            <ErrorBox>
              {state.message}
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  style={retryBtn}
                  onClick={() =>
                    loadSchedule(state.selected, state.groups, setState)
                  }
                >
                  Sprobuj ponownie
                </button>
              </div>
            </ErrorBox>
          )}

          {state.kind === 'loaded' && (
            <WeekGrid weekStart={weekStart} entries={entries} />
          )}
        </>
      )}
    </PageShell>
  )
}

/* --- helpers --- */

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
    const exists = groups.some((g) => String(g.groupId) === v)
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
  // Unikalne groupId (po deduplikacji 12_1 / 12_2 -> jedno "12")
  const uniqGroups = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; label: string }[] = []
    for (const g of groups) {
      const id = String(g.groupId)
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, label: `${g.yearSemLabel} - Grupa ${id}` })
    }
    return out
  }, [groups])

  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        marginBottom: '1rem',
        maxWidth: 360,
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>Twoja grupa</span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 6,
          border: '1px solid #D1D5DB',
        }}
      >
        {uniqGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #FECACA',
        background: '#FEF2F2',
        color: '#991B1B',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '1rem',
      }}
    >
      {children}
    </div>
  )
}

const retryBtn: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'white',
  color: '#991B1B',
  border: '1px solid #FCA5A5',
  borderRadius: 6,
  fontWeight: 500,
  cursor: 'pointer',
}
