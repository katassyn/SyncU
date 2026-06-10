import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  importTimetable,
  type ParsedTimetable,
  type ScheduleSection,
} from '@syncu/core'
import { Button, Card } from '@syncu/ui'
import { confirmTimetableImport } from '../lib/api'
import { getCurrentUser } from '../lib/auth'
import { PageShell } from './PageShell'

/**
 * G-3 #2 i #3 + G-5.6:
 *  - upload .xlsx (drag&drop albo input file)
 *  - parsowanie przez `importTimetable` z @syncu/core
 *  - preview: dropdown wyboru grupy + tabela wpisow
 *  - przycisk "Zapisz" -> POST /timetable/import/confirm (persystencja w bazie:
 *    semestr + przedmioty + class_sessions zalogowanego usera).
 */

type Phase =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'parsed'; data: ParsedTimetable; selectedSectionId: string; fileName: string }
  | { kind: 'error'; message: string }
  | { kind: 'saving' }
  | { kind: 'saved' }

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  async function handleFile(file: File) {
    if (!file.name.match(/\.xlsx?$/i)) {
      setPhase({ kind: 'error', message: 'Plik musi byc w formacie .xls lub .xlsx' })
      return
    }
    setPhase({ kind: 'parsing' })
    try {
      const buffer = await file.arrayBuffer()
      const data = importTimetable(buffer)
      const firstId = data.sections[0]?.id ?? ''
      setPhase({ kind: 'parsed', data, selectedSectionId: firstId, fileName: file.name })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany blad parsera'
      setPhase({ kind: 'error', message })
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function confirmImport(section: ScheduleSection, fileName: string) {
    setPhase({ kind: 'saving' })
    try {
      const user = await getCurrentUser()
      if (!user) {
        setPhase({ kind: 'error', message: 'Zaloguj się, aby zapisać plan na swoim koncie.' })
        return
      }

      await confirmTimetableImport({
        user: {
          email: user.email,
          displayName: user.displayName,
          university: user.university,
          fieldOfStudy: user.fieldOfStudy,
          yearOfStudy: user.yearOfStudy,
        },
        semester: deriveCurrentSemester(),
        source: { kind: 'upload', filename: fileName },
        section: {
          id: section.id,
          label: section.label,
          yearSemLabel: section.yearSemLabel,
          groupId: section.groupId,
          entries: section.entries,
        },
      })

      setPhase({ kind: 'saved' })
      setTimeout(() => navigate('/today'), 800)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany blad zapisu'
      setPhase({ kind: 'error', message })
    }
  }

  return (
    <PageShell
      title="Import"
      subtitle="Wgraj plan zajec z pliku .xls / .xlsx (format Politechniki Krakowskiej)"
    >
      {(phase.kind === 'idle' || phase.kind === 'parsing') && (
        <UploadDropzone
          dragActive={dragActive}
          loading={phase.kind === 'parsing'}
          loadingText="Parsowanie pliku..."
          acceptLabel="akceptowane: .xls, .xlsx"
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={onInputChange}
            className="hidden"
          />
        </UploadDropzone>
      )}

      {phase.kind === 'error' && (
        <Card
          variant="surface"
          padding="md"
          className="border border-danger/40 bg-danger/5 mb-4"
        >
          <p className="text-danger font-semibold mb-1">Błąd importu</p>
          <p className="text-muted text-ui mb-4">{phase.message}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPhase({ kind: 'idle' })}
          >
            Spróbuj ponownie
          </Button>
        </Card>
      )}

      {phase.kind === 'parsed' && (
        <ParsedPreview
          data={phase.data}
          selectedId={phase.selectedSectionId}
          onSelect={(id) => setPhase({ ...phase, selectedSectionId: id })}
          onConfirm={(section) => confirmImport(section, phase.fileName)}
          onCancel={() => setPhase({ kind: 'idle' })}
        />
      )}

      {phase.kind === 'saving' && (
        <div className="flex items-center gap-3 text-muted py-4">
          <svg className="animate-spin size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Zapisywanie...</span>
        </div>
      )}

      {phase.kind === 'saved' && (
        <Card
          variant="surface"
          padding="md"
          className="border border-success/40 bg-success/5"
        >
          <p className="text-success font-semibold">
            Plan zapisany. Przekierowuje na <strong>Today</strong>...
          </p>
        </Card>
      )}
    </PageShell>
  )
}

/* --- preview / krok potwierdzenia (G-3 #2) --- */

function ParsedPreview({
  data,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
}: {
  data: ParsedTimetable
  selectedId: string
  onSelect: (id: string) => void
  onConfirm: (section: ScheduleSection) => void
  onCancel: () => void
}) {
  const section = data.sections.find((s) => s.id === selectedId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 w-full sm:w-auto sm:min-w-[280px]">
          <span className="text-caption font-bold text-body tracking-label uppercase">
            Wybierz swoją grupę
          </span>
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-surface-1 rounded-pill px-4 py-2.5 text-ui text-heading border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-colors"
          >
            {data.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.entries.length} zajec)
              </option>
            ))}
          </select>
        </label>
        <p className="ml-auto text-muted text-caption">
          Sekcji: <strong className="text-heading">{data.sections.length}</strong>
          {' | '}
          Prowadzących:{' '}
          <strong className="text-heading">{data.lecturers.length}</strong>
        </p>
      </div>

      {section && (
        <>
          <Card variant="surface" padding="none" className="overflow-hidden">
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-2 sticky top-0">
                  <tr>
                    <Th>Data</Th>
                    <Th>Godzina</Th>
                    <Th>Zajecia</Th>
                  </tr>
                </thead>
                <tbody>
                  {section.entries.map((e, i) => (
                    <tr
                      key={`${e.date}-${e.time}-${i}`}
                      className="border-t border-border-subtle"
                    >
                      <Td>{e.date}</Td>
                      <Td>{e.time}</Td>
                      <Td>{e.subject}</Td>
                    </tr>
                  ))}
                  {section.entries.length === 0 && (
                    <tr>
                      <Td colSpan={3}>
                        <em className="text-muted">Brak wpisów dla tej grupy</em>
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="md" onClick={onCancel}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => onConfirm(section)}
              disabled={section.entries.length === 0}
            >
              Zapisz ({section.entries.length} zajec)
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Semestr wyliczany z biezacej daty: pazdziernik-luty = zimowy, marzec-wrzesien
 * = letni. `isActive: true`, bo GET /timetable/week filtruje po aktywnym semestrze.
 */
function deriveCurrentSemester() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const term = month >= 10 || month <= 2 ? 'zimowy' : 'letni'
  const academicYear = month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`
  return {
    name: `Semestr ${term} ${academicYear}`,
    academicYear,
    term,
    isActive: true,
  }
}

function Spinner() {
  return (
    <svg className="animate-spin size-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-caption font-semibold text-body uppercase tracking-label">
      {children}
    </th>
  )
}

function Td({
  children,
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className="px-3 py-2 text-ui text-heading">
      {children}
    </td>
  )
}
