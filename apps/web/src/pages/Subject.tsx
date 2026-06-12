import { useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { ExamCard } from '@syncu/ui'
import { extractSubjects, entryMatchesSubject, type SubjectInfo } from '@syncu/core'
import type { ScheduleEntry } from '@syncu/types'
import {
  deleteMaterial,
  fetchExams,
  fetchGroupSchedule,
  fetchMaterials,
  materialHref,
  uploadMaterial,
  type ExamRecord,
  type MaterialRecord,
} from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { PageShell } from './PageShell'

/**
 * Strona przedmiotu (/subject/:name, nazwa z planu PK).
 *  - Zajecia: wpisy planu grupy dopasowane do przedmiotu (po aliasach skrotow)
 *  - Kolokwia grupy dla przedmiotu
 *  - Pliki: GET /materials?course= jest GLOBALNE - kazdy, kto otworzy
 *    przedmiot, widzi wszystkie pliki dodane kiedykolwiek przez innych.
 */

const LS_GROUP_KEY = 'syncu.selectedGroup'

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | {
      kind: 'loaded'
      subject: SubjectInfo
      sessions: ScheduleEntry[]
      exams: ExamRecord[]
      materials: MaterialRecord[]
    }

export default function Subject() {
  const { name } = useParams<{ name: string }>()
  const auth = useAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retry, setRetry] = useState(0)

  const subjectName = name ? decodeURIComponent(name) : ''
  const user = auth.kind === 'authenticated' ? auth.user : null

  useEffect(() => {
    if (!subjectName || auth.kind === 'loading') return
    let groupId: string | null = null
    try {
      groupId = localStorage.getItem(LS_GROUP_KEY) ?? user?.groupId ?? null
    } catch {
      groupId = user?.groupId ?? null
    }

    let cancelled = false
    Promise.all([
      groupId ? fetchGroupSchedule(groupId) : Promise.resolve(null),
      fetchMaterials(subjectName).catch(() => ({ groupId: '', materials: [] as MaterialRecord[] })),
      fetchExams().catch(() => ({ exams: [] as ExamRecord[] })),
    ])
      .then(([schedule, materialsRes, examsRes]) => {
        if (cancelled) return

        const entries = schedule ? schedule.sections.flatMap((s) => s.entries) : []
        const subjects = extractSubjects(entries)
        const subject =
          subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase()) ?? {
            name: subjectName,
            aliases: [subjectName.toLowerCase()],
            entryCount: 0,
          }

        const sessions = entries
          .filter((e) => entryMatchesSubject(subject, e.subject))
          .sort((a, b) => compareDDMM(a.date, b.date) || a.time.localeCompare(b.time))

        const exams = examsRes.exams.filter(
          (e) => e.courseName.toLowerCase() === subject.name.toLowerCase(),
        )

        setState({ kind: 'loaded', subject, sessions, exams, materials: materialsRes.materials })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [subjectName, auth.kind, user?.groupId, retry])

  if (!subjectName) {
    return (
      <PageShell title="Przedmiot" subtitle="">
        <p className="text-ui text-muted">
          Nie podano przedmiotu.{' '}
          <NavLink to="/subjects" className="text-primary-nav font-semibold hover:underline">
            Zobacz listę przedmiotów
          </NavLink>
          .
        </p>
      </PageShell>
    )
  }

  return (
    <PageShell title={subjectName} subtitle="Zajęcia, kolokwia i pliki przedmiotu">
      <div className="mb-4">
        <NavLink
          to="/subjects"
          className="text-badge font-bold text-primary-nav hover:underline"
        >
          ← Wszystkie przedmioty
        </NavLink>
      </div>

      {(auth.kind === 'loading' || state.kind === 'loading') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="h-56 rounded-card-lg bg-surface-1 animate-pulse" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">
            Nie udało się pobrać danych przedmiotu
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

      {state.kind === 'loaded' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pliki przedmiotu */}
          <FilesCard
            subjectName={state.subject.name}
            materials={state.materials}
            currentUserId={user?.id ?? null}
            onChanged={(materials) =>
              setState((current) =>
                current.kind === 'loaded' ? { ...current, materials } : current,
              )
            }
          />

          <div className="flex flex-col gap-5">
            {/* Zajecia z planu */}
            <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
              <p className="text-h3 font-bold text-heading m-0">
                Zajęcia w planie{' '}
                <span className="text-muted font-semibold">({state.sessions.length})</span>
              </p>
              {state.sessions.length === 0 ? (
                <p className="text-ui text-muted m-0">
                  Brak terminów tego przedmiotu w planie Twojej grupy.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {state.sessions.map((session, i) => (
                    <div
                      key={`${session.date}-${session.time}-${i}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-card-sm bg-surface-1"
                    >
                      <span className="text-ui font-semibold text-heading shrink-0 w-14">
                        {session.date}
                      </span>
                      <span className="text-caption text-muted">{session.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Kolokwia grupy */}
            <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
              <p className="text-h3 font-bold text-heading m-0">Kolokwia grupy</p>
              {state.exams.length === 0 ? (
                <p className="text-ui text-muted m-0">
                  Brak kolokwiów z tego przedmiotu.{' '}
                  <NavLink to="/exams" className="text-primary-nav font-semibold hover:underline">
                    Dodaj pierwsze
                  </NavLink>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {state.exams.map((exam) => (
                    <ExamCard
                      key={exam.id}
                      courseName={exam.courseName}
                      date={exam.date}
                      scope={exam.scope}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </PageShell>
  )
}

/* --- pliki przedmiotu --- */

function FilesCard({
  subjectName,
  materials,
  currentUserId,
  onChanged,
}: {
  subjectName: string
  materials: MaterialRecord[]
  currentUserId: number | null
  onChanged: (materials: MaterialRecord[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Wybierz plik do wgrania.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Plik może mieć maksymalnie 10 MB.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await uploadMaterial({
        file,
        title: title.trim() || undefined,
        courseName: subjectName,
      })
      onChanged([res.material, ...materials])
      setTitle('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wgrać pliku.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMaterial(id)
      onChanged(materials.filter((m) => m.id !== id))
    } catch {
      // material zostaje na liscie, mozna sprobowac ponownie
    }
  }

  return (
    <section className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
      <p className="text-h3 font-bold text-heading m-0">
        Pliki <span className="text-muted font-semibold">({materials.length})</span>
      </p>

      <form onSubmit={handleUpload} className="flex flex-col gap-3 pb-4 border-b border-border-subtle">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł (opcjonalnie, domyślnie nazwa pliku)"
          maxLength={200}
          disabled={saving}
          className="w-full bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading placeholder:text-muted border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={saving}
          className="w-full text-ui text-heading file:mr-3 file:rounded-pill file:border-0 file:bg-primary-light file:text-primary-nav file:font-semibold file:text-caption file:px-4 file:py-2 file:cursor-pointer cursor-pointer"
        />
        {file && (
          <span className="text-caption text-muted">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        )}
        {error && <p className="text-ui text-danger m-0">{error}</p>}
        <button
          type="submit"
          disabled={saving || !file}
          className="self-end bg-primary text-on-primary text-ui font-semibold rounded-pill px-5 py-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {saving ? 'Wgrywanie...' : 'Wgraj plik'}
        </button>
      </form>

      {materials.length === 0 ? (
        <p className="text-ui text-muted m-0">
          Nikt nie dodał jeszcze plików do tego przedmiotu. Bądź pierwszy!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((material) => (
            <div key={material.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0 border-l-[3px] border-primary pl-3 py-1">
                <a
                  href={materialHref(material.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui font-semibold text-primary-nav hover:underline leading-snug break-words"
                >
                  {material.title} 📎
                </a>
                <p className="text-badge text-muted m-0">
                  {currentUserId !== null && material.uploadedBy === currentUserId
                    ? 'Ty'
                    : material.authorName}
                  {' · '}
                  {formatFileSize(material.fileSize)}
                  {' · '}
                  {new Date(material.createdAt).toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              {currentUserId !== null && material.uploadedBy === currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDelete(material.id)}
                  aria-label={`Usuń plik ${material.title}`}
                  className="text-muted hover:text-danger text-lg leading-none cursor-pointer shrink-0 px-1"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* --- helpers --- */

/** "7.06" -> sortowalna wartosc (rok szkolny: pazdziernik < ... < wrzesien). */
function compareDDMM(a: string, b: string): number {
  return ddmmSortKey(a) - ddmmSortKey(b)
}

function ddmmSortKey(ddmm: string): number {
  const [d = 0, m = 0] = ddmm.split('.').map(Number)
  // Rok akademicki zaczyna sie w pazdzierniku - misiace 10-12 przed 1-9
  const academicMonth = m >= 10 ? m - 10 : m + 3
  return academicMonth * 100 + d
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
