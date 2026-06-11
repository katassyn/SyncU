import { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ExamCard } from '@syncu/ui'
import {
  fetchCourseDetail,
  fetchMaterials,
  materialHref,
  type CourseDetail,
  type MaterialRecord,
} from '../lib/api'
import { PageShell } from './PageShell'

/**
 * Strona przedmiotu (/subject/:id, id = courseId z importu usera):
 * zajecia (class_sessions), kolokwia przedmiotu i materialy grupy
 * dopasowane po nazwie przedmiotu. Linkowana z listy kolokwiow (/exams).
 */

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; detail: CourseDetail; materials: MaterialRecord[] }

export default function Subject() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    const courseId = Number(id)
    if (!Number.isInteger(courseId) || courseId < 1) {
      setState({ kind: 'not-found' })
      return
    }
    let cancelled = false
    Promise.all([
      fetchCourseDetail(courseId),
      // Materialy sa per grupa - brak grupy (400) nie powinien wywracac strony
      fetchMaterials().catch(() => ({ groupId: '', materials: [] as MaterialRecord[] })),
    ])
      .then(([detail, materialsRes]) => {
        if (cancelled) return
        const courseNameNormalized = detail.course.name.trim().toLowerCase()
        const materials = materialsRes.materials.filter(
          (m) => m.courseName.trim().toLowerCase() === courseNameNormalized,
        )
        setState({ kind: 'loaded', detail, materials })
      })
      .catch((err) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : ''
        setState(message.includes('404') ? { kind: 'not-found' } : { kind: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (state.kind === 'loading') {
    return (
      <PageShell title="Przedmiot" subtitle="Ładowanie...">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-card-sm bg-surface-1 animate-pulse" />
          ))}
        </div>
      </PageShell>
    )
  }

  if (state.kind === 'not-found' || state.kind === 'error') {
    return (
      <PageShell title="Przedmiot" subtitle="">
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">
            {state.kind === 'not-found'
              ? 'Nie znaleziono przedmiotu'
              : 'Nie udało się pobrać przedmiotu'}
          </p>
          <p className="text-ui text-muted m-0">
            {state.kind === 'not-found'
              ? 'Ten przedmiot nie istnieje albo nie należy do Twojego konta.'
              : 'Spróbuj ponownie za chwilę.'}
          </p>
          <NavLink to="/exams" className="text-badge font-bold text-primary-nav hover:underline">
            ← Wróć do kolokwiów
          </NavLink>
        </div>
      </PageShell>
    )
  }

  const { course, sessions, exams } = state.detail

  return (
    <PageShell
      title={course.name}
      subtitle={[course.lecturerName, course.room].filter(Boolean).join(' · ') || 'Twój przedmiot'}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Zajecia */}
        <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
          <p className="text-h3 font-bold text-heading m-0">
            Zajęcia <span className="text-muted font-semibold">({sessions.length})</span>
          </p>
          {sessions.length === 0 ? (
            <p className="text-ui text-muted m-0">
              Brak zajęć w bazie.{' '}
              <NavLink to="/import" className="text-primary-nav font-semibold hover:underline">
                Zaimportuj plan
              </NavLink>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-card-sm bg-surface-1"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-semibold text-heading m-0">
                      {formatSessionDate(session.startsAt)}
                    </p>
                    <p className="text-caption text-muted m-0">
                      {formatTimeRange(session.startsAt, session.endsAt)}
                      {session.room ? ` · ${session.room}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-5">
          {/* Kolokwia */}
          <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">Kolokwia</p>
            {exams.length === 0 ? (
              <p className="text-ui text-muted m-0">
                Brak kolokwiów dla tego przedmiotu.{' '}
                <NavLink to="/exams" className="text-primary-nav font-semibold hover:underline">
                  Dodaj
                </NavLink>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {exams.map((exam) => (
                  <ExamCard
                    key={exam.id}
                    courseName={course.name}
                    date={exam.date}
                    scope={exam.scope}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Materialy grupy dla tego przedmiotu */}
          <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">Materiały grupy</p>
            {state.materials.length === 0 ? (
              <p className="text-ui text-muted m-0">
                Brak materiałów dla tego przedmiotu. Dodaj je na stronie{' '}
                <NavLink to="/library" className="text-primary-nav font-semibold hover:underline">
                  grupy
                </NavLink>{' '}
                (podaj nazwę przedmiotu: <em>{course.name}</em>).
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {state.materials.map((material) => (
                  <div
                    key={material.id}
                    className="border-l-[3px] border-primary pl-3 py-1 flex flex-col gap-0.5"
                  >
                    <a
                      href={materialHref(material.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ui font-semibold text-primary-nav hover:underline leading-snug break-words"
                    >
                      {material.title} ({(material.fileSize / 1024 / 1024).toFixed(1)} MB)
                    </a>
                    <p className="text-badge text-muted m-0">{material.authorName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  )
}

function formatSessionDate(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  if (Number.isNaN(date.getTime())) return isoDateTime
  return date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' })
}

function formatTimeRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) => {
    const date = new Date(iso)
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }
  return `${fmt(startsAt)}–${fmt(endsAt)}`
}
