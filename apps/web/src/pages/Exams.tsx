import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Button, ExamCard, Form, FormField, Input, Select } from '@syncu/ui'
import { createExam, fetchCourses, fetchExams, type ExamRecord } from '../lib/api'
import { PageShell } from './PageShell'

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; upcoming: ExamRecord[]; past: ExamRecord[] }
  | { kind: 'error' }

type CourseOption = { id: number; name: string }

type CoursesState =
  | { kind: 'loading' }
  | { kind: 'loaded'; courses: CourseOption[] }
  | { kind: 'error' }

export default function Exams() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retry, setRetry] = useState(0)
  const [coursesState, setCoursesState] = useState<CoursesState>({ kind: 'loading' })
  const [showForm, setShowForm] = useState(false)

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

  // Lista przedmiotow do pickera w formularzu - GET /courses (wszystkie
  // przedmioty usera ze wszystkich semestrow, niezaleznie od tygodnia).
  useEffect(() => {
    let cancelled = false
    fetchCourses()
      .then((res) => {
        if (cancelled) return
        const unique = new Map<number, string>()
        for (const course of res.courses) unique.set(course.id, course.name)
        const courses = [...unique]
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
        setCoursesState({ kind: 'loaded', courses })
      })
      .catch(() => {
        if (!cancelled) setCoursesState({ kind: 'error' })
      })
    return () => { cancelled = true }
  }, [])

  function handleCreated() {
    setShowForm(false)
    setState({ kind: 'loading' })
    setRetry((n) => n + 1)
  }

  return (
    <PageShell title="Kolokwia i egzaminy" subtitle="Twoje nadchodzące i minione terminy">

      <div className="mb-6">
        <Button
          variant={showForm ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Zamknij formularz' : '+ Dodaj kolokwium'}
        </Button>
      </div>

      {showForm && (
        <AddExamForm
          coursesState={coursesState}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

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
              <NavLink
                key={exam.id}
                to={`/subject/${exam.courseId}`}
                className="block rounded-card-sm hover:bg-surface-1 transition-colors"
              >
                <ExamCard
                  courseName={exam.courseName}
                  date={exam.date}
                  scope={exam.scope}
                />
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {state.kind === 'loaded' && state.past.length > 0 && (
        <section>
          <p className="text-h3 font-bold text-muted mb-4">Minione</p>
          <div className="flex flex-col gap-3 max-w-lg">
            {state.past.map((exam) => (
              <NavLink
                key={exam.id}
                to={`/subject/${exam.courseId}`}
                className="block rounded-card-sm hover:bg-surface-1 transition-colors"
              >
                <ExamCard
                  courseName={exam.courseName}
                  date={exam.date}
                  scope={exam.scope}
                />
              </NavLink>
            ))}
          </div>
        </section>
      )}

    </PageShell>
  )
}

function AddExamForm({
  coursesState,
  onCreated,
  onCancel,
}: {
  coursesState: CoursesState
  onCreated: () => void
  onCancel: () => void
}) {
  const [courseId, setCourseId] = useState('')
  const [date, setDate] = useState('')
  const [scope, setScope] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const courseOptions = useMemo(
    () =>
      coursesState.kind === 'loaded'
        ? coursesState.courses.map((c) => ({ value: String(c.id), label: c.name }))
        : [],
    [coursesState],
  )

  const noCourses = coursesState.kind === 'loaded' && courseOptions.length === 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courseId) { setError('Wybierz przedmiot.'); return }
    if (!date) { setError('Wybierz datę.'); return }

    setSaving(true)
    setError(null)
    try {
      // Data dnia -> ISO date-time (lokalne poludnie, by uniknac przesuniecia o dzien).
      const isoDate = new Date(`${date}T12:00:00`).toISOString()
      await createExam({
        courseId: Number(courseId),
        date: isoDate,
        scope: scope.trim() || null,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać kolokwium.')
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-card-lg shadow-card-sm p-6 mb-8 max-w-lg">
      <p className="text-h3 font-bold text-heading mb-4">Nowe kolokwium</p>

      {coursesState.kind === 'error' && (
        <p className="text-ui text-danger mb-3">
          Nie udało się pobrać listy przedmiotów. Spróbuj odświeżyć stronę.
        </p>
      )}

      {noCourses ? (
        <div className="flex flex-col gap-3">
          <p className="text-ui text-muted m-0">
            Brak przedmiotów do wyboru w planie bieżącego tygodnia. Zaimportuj plan
            zajęć, aby móc dodać kolokwium.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              Zamknij
            </Button>
          </div>
        </div>
      ) : (
        <Form onSubmit={handleSubmit}>
          <Select
            label="Przedmiot"
            id="exam-course"
            placeholder="Wybierz przedmiot"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            options={courseOptions}
            disabled={saving || coursesState.kind !== 'loaded'}
            required
          />

          <FormField label="Data" htmlFor="exam-date">
            <Input
              id="exam-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={saving}
              required
            />
          </FormField>

          <FormField
            label="Zakres (opcjonalnie)"
            htmlFor="exam-scope"
            hint="Np. rozdziały albo tematy do nauki."
          >
            <textarea
              id="exam-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              disabled={saving}
              maxLength={1000}
              rows={3}
              className="w-full bg-surface-1 rounded-card-sm text-ui text-heading placeholder:text-muted border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors duration-150 px-4 py-2.5 resize-y"
            />
          </FormField>

          {error && <p className="text-ui text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
              Anuluj
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz kolokwium'}
            </Button>
          </div>
        </Form>
      )}
    </div>
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
