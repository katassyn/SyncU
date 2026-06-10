import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Badge, Button, ExamCard, Select } from '@syncu/ui'
import {
  createMaterial,
  fetchGroupExams,
  fetchGroupMembers,
  fetchMaterials,
  materialHref,
  uploadMaterial,
  type GroupExamRecord,
  type GroupMember,
  type MaterialKind,
  type MaterialRecord,
} from '../lib/api'
import { useAuth } from '../lib/auth'

/**
 * G-13 + G-14: strona grupy ("Grupy" w nav, route /library).
 *  - czlonkowie mojej grupy (GET /groups/members)
 *  - wspolne kolokwia grupy z autorem (GET /exams?view=group)
 *  - materialy grupy + dodawanie (GET/POST /materials)
 */

type GroupData = {
  groupId: string
  members: GroupMember[]
  exams: GroupExamRecord[]
  materials: MaterialRecord[]
}

type State =
  | { kind: 'loading' }
  | { kind: 'no-group' }
  | { kind: 'error' }
  | { kind: 'loaded'; data: GroupData }

const KIND_LABEL: Record<MaterialKind, string> = {
  notatki: 'Notatki',
  link: 'Link',
  zadania: 'Zadania',
  inne: 'Inne',
}

export default function Library() {
  const auth = useAuth()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [retry, setRetry] = useState(0)

  const user = auth.kind === 'authenticated' ? auth.user : null

  useEffect(() => {
    if (auth.kind === 'loading') return
    if (!user?.groupId) {
      setState({ kind: 'no-group' })
      return
    }
    let cancelled = false
    Promise.all([fetchGroupMembers(), fetchGroupExams(), fetchMaterials()])
      .then(([membersRes, examsRes, materialsRes]) => {
        if (cancelled) return
        setState({
          kind: 'loaded',
          data: {
            groupId: membersRes.groupId,
            members: membersRes.members,
            exams: examsRes.exams,
            materials: materialsRes.materials,
          },
        })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    return () => {
      cancelled = true
    }
    // auth.kind zmienia sie raz (loading -> authenticated), user.groupId stale w sesji
  }, [auth.kind, user?.groupId, retry])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="text-display font-extrabold text-heading m-0 leading-none">
          Twoja grupa{state.kind === 'loaded' ? ` ${state.data.groupId}` : ''}
        </p>
        <p className="text-body text-muted mt-2 mb-0">
          Członkowie, wspólne kolokwia i materiały Twojej grupy.
        </p>
      </div>

      {(auth.kind === 'loading' || state.kind === 'loading') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 rounded-card-lg bg-surface-1 animate-pulse" />
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
            , aby zobaczyć członków i wspólne materiały.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <p className="text-h3 font-semibold text-heading m-0">Nie udało się pobrać danych grupy</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Czlonkowie */}
          <div className="lg:col-span-4 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">
              Członkowie{' '}
              <span className="text-muted font-semibold">({state.data.members.length})</span>
            </p>
            <div className="flex flex-col gap-3">
              {state.data.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="size-9 rounded-pill bg-primary-light text-primary-nav font-bold text-caption flex items-center justify-center shrink-0 select-none">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ui font-semibold text-heading m-0 truncate">
                      {member.displayName}
                      {user && member.id === user.id && (
                        <span className="text-muted font-normal"> (Ty)</span>
                      )}
                    </p>
                    <p className="text-caption text-muted m-0 truncate">
                      {member.fieldOfStudy ?? 'Informatyka'}
                      {member.yearOfStudy ? ` · rok ${member.yearOfStudy}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kolokwia grupy */}
          <div className="lg:col-span-4 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">Kolokwia grupy</p>
            {state.data.exams.length === 0 ? (
              <p className="text-ui text-muted m-0">
                Nikt z grupy nie dodał jeszcze kolokwium.{' '}
                <NavLink to="/exams" className="text-primary-nav font-semibold hover:underline">
                  Dodaj pierwsze
                </NavLink>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {state.data.exams.map((exam) => (
                  <div key={exam.id}>
                    <ExamCard courseName={exam.courseName} date={exam.date} scope={exam.scope} />
                    <p className="text-badge text-muted m-0 mt-1 pl-3">
                      Dodane przez:{' '}
                      <span className="font-bold">
                        {user && exam.userId === user.id ? 'Ciebie' : exam.authorName}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materialy */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <MaterialsCard
              materials={state.data.materials}
              currentUserId={user?.id ?? null}
              onCreated={(material) =>
                setState((current) =>
                  current.kind === 'loaded'
                    ? {
                        kind: 'loaded',
                        data: {
                          ...current.data,
                          materials: [material, ...current.data.materials],
                        },
                      }
                    : current,
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MaterialsCard({
  materials,
  currentUserId,
  onCreated,
}: {
  materials: MaterialRecord[]
  currentUserId: number | null
  onCreated: (material: MaterialRecord) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<MaterialKind>('notatki')
  const [url, setUrl] = useState('')
  const [courseName, setCourseName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() && !file) {
      setError('Podaj tytuł materiału albo wybierz plik.')
      return
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError('Plik może mieć maksymalnie 10 MB.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Z plikiem -> multipart /materials/upload; bez pliku -> JSON /materials
      const res = file
        ? await uploadMaterial({
            file,
            title: title.trim() || undefined,
            kind,
            courseName: courseName.trim() || null,
          })
        : await createMaterial({
            title: title.trim(),
            kind,
            url: url.trim() || null,
            courseName: courseName.trim() || null,
          })
      onCreated(res.material)
      setTitle('')
      setUrl('')
      setCourseName('')
      setFile(null)
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać materiału.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-h3 font-bold text-heading m-0">Materiały</p>
        <Button
          type="button"
          variant={showForm ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Anuluj' : '+ Dodaj'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tytuł (np. Notatki z wykładu 3)"
            maxLength={200}
            disabled={saving}
            className="w-full bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading placeholder:text-muted border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
          <Select
            id="material-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as MaterialKind)}
            disabled={saving}
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link (np. Google Drive, opcjonalnie)"
            maxLength={2000}
            disabled={saving || !!file}
            className="w-full bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading placeholder:text-muted border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors disabled:opacity-50"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-bold text-body tracking-label uppercase">
              Albo wgraj plik (max 10 MB)
            </span>
            <input
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
          </label>
          <input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Przedmiot (opcjonalnie)"
            maxLength={200}
            disabled={saving}
            className="w-full bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading placeholder:text-muted border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
          {error && <p className="text-ui text-danger m-0">{error}</p>}
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz materiał'}
          </Button>
        </form>
      )}

      {materials.length === 0 && !showForm && (
        <p className="text-ui text-muted m-0">
          Brak materiałów. Podziel się pierwszymi notatkami ze swoją grupą.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {materials.map((material) => (
          <div
            key={material.id}
            className="border-l-[3px] border-primary pl-3 py-1.5 flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{KIND_LABEL[material.kind] ?? material.kind}</Badge>
              {material.courseName && (
                <span className="text-badge text-muted uppercase tracking-badge font-bold">
                  {material.courseName}
                </span>
              )}
            </div>
            {material.url ? (
              <a
                href={materialHref(material.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ui font-semibold text-primary-nav hover:underline m-0 leading-snug break-words"
              >
                {material.title} {material.fileName ? '📎' : '↗'}
              </a>
            ) : (
              <p className="text-ui font-semibold text-heading m-0 leading-snug">{material.title}</p>
            )}
            {material.fileName && material.fileName !== material.title && (
              <p className="text-badge text-muted m-0 break-words">{material.fileName}</p>
            )}
            {material.content && (
              <p className="text-caption text-muted m-0 leading-snug">{material.content}</p>
            )}
            <p className="text-badge text-muted m-0">
              {currentUserId !== null && material.userId === currentUserId
                ? 'Ty'
                : material.authorName}
              {' · '}
              {new Date(material.createdAt).toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
