import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Select } from '@syncu/ui'
import { fetchGroups, type GroupSummary } from '../lib/api'
import { updateCurrentUserProfile } from '../lib/auth'

/**
 * G-7.4: Strona /onboarding (uproszczona po decyzji "tylko PK niestacjonarne").
 *
 * Decyzja zespolu (tydzien 04.05): user wybiera tylko grupe w formacie XY_Z
 * (X=rok, Y=grupa cwiczeniowa, Z=podgrupa labowa). Uczelnia/kierunek/rok
 * sa stale (Politechnika Krakowska, Informatyka, niestacjonarne).
 *
 * Persystencja:
 *  - localStorage `syncu.selectedGroup` (np. "32_1")
 *  - Pozniej, gdy Kamil zrobi G-7.1 + G-7.2: dodatkowo PATCH /me z group_id
 *    (zalozenie: backend storage to wlasciwa droga, localStorage jako cache)
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; groups: GroupSummary[] }
  | { kind: 'error'; message: string }

export default function Onboarding() {
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchGroups()
      .then((res) => {
        if (cancelled) return
        if (res.groups.length === 0) {
          setState({
            kind: 'error',
            message: 'Backend nie zwrócił żadnych grup. Spróbuj później.',
          })
          return
        }
        // Domyslnie pierwsza grupa po sortowaniu
        const sortedFirst = [...res.groups].sort((a, b) => {
          const ag = Number(a.groupId)
          const bg = Number(b.groupId)
          if (ag !== bg) return ag - bg
          return a.id.localeCompare(b.id)
        })[0]
        const stored = readStored(res.groups)
        setSelected(stored ?? sortedFirst.id)
        setState({ kind: 'loaded', groups: res.groups })
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

  const sortedGroups = useMemo(() => {
    if (state.kind !== 'loaded') return []
    return [...state.groups].sort((a, b) => {
      const ag = Number(a.groupId)
      const bg = Number(b.groupId)
      if (ag !== bg) return ag - bg
      return a.id.localeCompare(b.id)
    })
  }, [state])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setSubmitError(null)

    try {
      await updateCurrentUserProfile({
        university: 'Politechnika Krakowska',
        fieldOfStudy: 'Informatyka',
        yearOfStudy: parseYearFromGroup(selected),
        groupId: selected,
      })
      try {
        localStorage.setItem(LS_GROUP_KEY, selected)
      } catch {
        // ignore (private mode)
      }
      navigate('/today', { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Nieznany błąd zapisu profilu')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-8">
      <Card variant="white" padding="lg" className="w-full max-w-md">
        <h1 className="text-h2 font-bold text-heading mb-1">
          Wybierz swoją grupę
        </h1>
        <p className="text-ui text-muted mb-6">
          Plan zajec, kolokwia i statystyki beda dostosowane do Twojej grupy.
          Format: <code className="text-heading font-mono">XY_Z</code> (X = rok,
          Y = grupa cwiczeniowa, Z = podgrupa labowa).
        </p>

        {state.kind === 'loading' && (
          <p className="text-ui text-muted">Ladowanie listy grup...</p>
        )}

        {state.kind === 'error' && (
          <div className="border border-danger/40 bg-danger/5 rounded-card p-4 mb-4">
            <p className="text-ui text-danger font-semibold mb-1">Błąd</p>
            <p className="text-ui text-muted">{state.message}</p>
          </div>
        )}

        {state.kind === 'loaded' && (
          <Form onSubmit={handleSubmit}>
            <Select
              label="Grupa"
              id="group"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={saving}
            >
              {sortedGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </Select>

            {submitError && (
              <p className="text-ui text-danger -mt-1">{submitError}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!selected || saving}
            >
              {saving ? 'Zapisywanie...' : 'Kontynuuj'}
            </Button>
          </Form>
        )}

        <p className="text-caption text-muted text-center mt-6">
          Mozesz pozniej zmienic grupe w ustawieniach profilu.
        </p>
      </Card>
    </div>
  )
}

/* --- helpers --- */

function readStored(groups: GroupSummary[]): string | null {
  try {
    const v = localStorage.getItem(LS_GROUP_KEY)
    if (!v) return null
    return groups.some((g) => g.id === v) ? v : null
  } catch {
    return null
  }
}

function parseYearFromGroup(groupId: string): number | null {
  const year = Number(groupId.charAt(0))
  return Number.isInteger(year) && year >= 1 && year <= 10 ? year : null
}
