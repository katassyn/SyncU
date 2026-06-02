import { useEffect, useState } from 'react'
import { ExamCard } from '@syncu/ui'
import { fetchExams, type ExamRecord } from '../lib/api'
import { PageShell } from './PageShell'

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; upcoming: ExamRecord[]; past: ExamRecord[] }
  | { kind: 'error' }

export default function Exams() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchExams()
      .then((res) => {
        if (cancelled) return
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const upcoming = res.exams
          .filter((e) => new Date(e.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const past = res.exams
          .filter((e) => new Date(e.date) < now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setState({ kind: 'loaded', upcoming, past })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    return () => { cancelled = true }
  }, [retry])

  return (
    <PageShell title="Kolokwia i egzaminy" subtitle="Twoje nadchodzące i minione terminy">

      {state.kind === 'loading' && (
        <div className="flex flex-col gap-3 max-w-lg">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-card-sm bg-surface-1 animate-pulse" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">Nie udało się pobrać kolokwiów</p>
          <button
            onClick={() => { setState({ kind: 'loading' }); setRetry((n) => n + 1) }}
            className="text-badge font-bold text-primary-nav hover:underline cursor-pointer"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {state.kind === 'loaded' && state.upcoming.length === 0 && state.past.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4 text-center">
          <CalendarEmptyIcon />
          <p className="text-h3 font-semibold text-heading m-0">Brak wpisanych terminów</p>
          <p className="text-ui text-muted m-0">
            Nie masz jeszcze żadnych kolokwiów ani egzaminów.
          </p>
        </div>
      )}

      {state.kind === 'loaded' && state.upcoming.length > 0 && (
        <section className="mb-8">
          <p className="text-h3 font-bold text-heading mb-4">Nadchodzące</p>
          <div className="flex flex-col gap-3 max-w-lg">
            {state.upcoming.map((exam) => (
              <ExamCard
                key={exam.id}
                courseName={exam.courseName}
                date={exam.date}
                scope={exam.scope}
              />
            ))}
          </div>
        </section>
      )}

      {state.kind === 'loaded' && state.past.length > 0 && (
        <section>
          <p className="text-h3 font-bold text-muted mb-4">Minione</p>
          <div className="flex flex-col gap-3 max-w-lg">
            {state.past.map((exam) => (
              <ExamCard
                key={exam.id}
                courseName={exam.courseName}
                date={exam.date}
                scope={exam.scope}
              />
            ))}
          </div>
        </section>
      )}

    </PageShell>
  )
}

function CalendarEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="text-muted">
      <rect x="6" y="10" width="36" height="32" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 18h36" stroke="currentColor" strokeWidth="2" />
      <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 28h14M17 34h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
