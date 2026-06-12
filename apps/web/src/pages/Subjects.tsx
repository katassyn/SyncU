import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { extractSubjects, type SubjectInfo } from '@syncu/core'
import { fetchGroupSchedule } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { PageShell } from './PageShell'

/**
 * Strona /subjects ("Przedmioty" w sidebarze kalendarza).
 * Lista przedmiotow wyciagnieta z automatycznie scrapowanego planu PK
 * (GET /schedule/group/:groupId + extractSubjects z @syncu/core).
 * Klik w przedmiot -> /subject/:name (pliki, zajecia, kolokwia).
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

type State =
  | { kind: 'loading' }
  | { kind: 'no-group' }
  | { kind: 'error' }
  | { kind: 'loaded'; groupId: string; subjects: SubjectInfo[] }

function readSelectedGroup(userGroupId: string | null): string | null {
  try {
    return localStorage.getItem(LS_GROUP_KEY) ?? userGroupId
  } catch {
    return userGroupId
  }
}

export default function Subjects() {
  const auth = useAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retry, setRetry] = useState(0)

  const userGroupId = auth.kind === 'authenticated' ? auth.user.groupId : null

  useEffect(() => {
    if (auth.kind === 'loading') return
    const groupId = readSelectedGroup(userGroupId)
    if (!groupId) {
      setState({ kind: 'no-group' })
      return
    }
    let cancelled = false
    fetchGroupSchedule(groupId)
      .then((schedule) => {
        if (cancelled) return
        const entries = schedule.sections.flatMap((s) => s.entries)
        setState({ kind: 'loaded', groupId, subjects: extractSubjects(entries) })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [auth.kind, userGroupId, retry])

  return (
    <PageShell
      title="Przedmioty"
      subtitle={
        state.kind === 'loaded'
          ? `Przedmioty z planu grupy ${state.groupId}`
          : 'Przedmioty z Twojego planu zajęć'
      }
    >
      {(auth.kind === 'loading' || state.kind === 'loading') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-card-lg bg-surface-1 animate-pulse" />
          ))}
        </div>
      )}

      {auth.kind !== 'loading' && state.kind === 'no-group' && (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <p className="text-h3 font-semibold text-heading m-0">Nie wybrałeś jeszcze grupy</p>
          <p className="text-ui text-muted m-0">
            Ustaw swoją grupę w{' '}
            <NavLink to="/profile" className="text-primary-nav font-semibold hover:underline">
              profilu
            </NavLink>
            , aby zobaczyć przedmioty ze swojego planu.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">
            Nie udało się pobrać planu zajęć
          </p>
          <button
            onClick={() => {
              setState({ kind: 'loading' })
              setRetry((n) => n + 1)
            }}
            className="text-badge font-bold text-primary-nav hover:underline cursor-pointer"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {state.kind === 'loaded' && state.subjects.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">Brak przedmiotów w planie</p>
          <p className="text-ui text-muted m-0">
            Plan grupy {state.groupId} nie zawiera jeszcze żadnych zajęć.
          </p>
        </div>
      )}

      {state.kind === 'loaded' && state.subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.subjects.map((subject) => (
            <NavLink
              key={subject.name}
              to={`/subject/${encodeURIComponent(subject.name)}`}
              className="bg-white rounded-card-lg shadow-card-sm p-5 flex flex-col gap-2 hover:shadow-card transition-shadow"
            >
              <div className="size-10 rounded-card-sm bg-primary-light text-primary-nav flex items-center justify-center shrink-0">
                <BookIcon />
              </div>
              <p className="text-body font-bold text-heading m-0 leading-snug">
                {subject.name}
              </p>
              <p className="text-caption text-muted m-0 mt-auto">
                {subject.entryCount}{' '}
                {subject.entryCount === 1 ? 'termin w planie' : 'terminy w planie'}
              </p>
            </NavLink>
          ))}
        </div>
      )}
    </PageShell>
  )
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h9a2 2 0 012 2v8a2 2 0 01-2 2H3V4z" />
      <path d="M12 4a2 2 0 012 2v8" />
      <path d="M6 8h5M6 11h3" />
    </svg>
  )
}
