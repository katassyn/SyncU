import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  importTimetable,
  type ParsedTimetable,
  type ScheduleSection,
} from '@syncu/core'
import { PageShell } from './PageShell'

/**
 * G-3 #2 i #3:
 *  - upload .xlsx (drag&drop albo input file)
 *  - parsowanie przez `importTimetable` z @syncu/core
 *  - preview: dropdown wyboru grupy + tabela wpisow
 *  - przycisk "Zapisz" -> confirmImport() -> POST do api (mock dopoki Kamil
 *    nie ma BACK-08).
 */

type Phase =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'parsed'; data: ParsedTimetable; selectedSectionId: string }
  | { kind: 'error'; message: string }
  | { kind: 'saving' }
  | { kind: 'saved' }

const dropZoneStyle = (active: boolean): React.CSSProperties => ({
  border: `2px dashed ${active ? '#4F46E5' : '#D1D5DB'}`,
  borderRadius: 12,
  padding: '3rem 2rem',
  textAlign: 'center',
  background: active ? '#EEF2FF' : '#FAFAFA',
  cursor: 'pointer',
  transition: 'all 120ms ease',
})

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
      setPhase({ kind: 'parsed', data, selectedSectionId: firstId })
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

  async function confirmImport(section: ScheduleSection) {
    setPhase({ kind: 'saving' })
    try {
      // TODO: prawdziwy endpoint Kamila (BACK-08), na razie mock.
      // const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
      // await fetch(`${apiUrl}/timetable/import`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ sectionId: section.id, entries: section.entries }),
      // })
      console.log('[confirmImport] TODO: wyslij do API', {
        sectionId: section.id,
        groupId: section.groupId,
        entriesCount: section.entries.length,
      })
      await new Promise((r) => setTimeout(r, 400)) // udajemy network
      setPhase({ kind: 'saved' })
      // krotki delay zeby user zobaczyl "Zapisane", potem na today
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
      {phase.kind === 'idle' && (
        <div
          style={dropZoneStyle(dragActive)}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Upusc plik tutaj albo kliknij, zeby wybrac
          </p>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            akceptowane: .xls, .xlsx
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={onInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {phase.kind === 'parsing' && <p>Parsowanie pliku...</p>}

      {phase.kind === 'error' && (
        <div
          style={{
            border: '1px solid #FECACA',
            background: '#FEF2F2',
            color: '#991B1B',
            borderRadius: 8,
            padding: '1rem',
          }}
        >
          <strong>Blad: </strong>
          {phase.message}
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setPhase({ kind: 'idle' })}
              style={btnSecondaryStyle}
            >
              Sprobuj ponownie
            </button>
          </div>
        </div>
      )}

      {phase.kind === 'parsed' && (
        <ParsedPreview
          data={phase.data}
          selectedId={phase.selectedSectionId}
          onSelect={(id) =>
            setPhase({ ...phase, selectedSectionId: id })
          }
          onConfirm={(section) => confirmImport(section)}
          onCancel={() => setPhase({ kind: 'idle' })}
        />
      )}

      {phase.kind === 'saving' && <p>Zapisywanie...</p>}

      {phase.kind === 'saved' && (
        <div
          style={{
            border: '1px solid #BBF7D0',
            background: '#F0FDF4',
            color: '#166534',
            borderRadius: 8,
            padding: '1rem',
          }}
        >
          Plan zapisany. Przekierowuje na <strong>Today</strong>...
        </div>
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
    <div>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
            Wybierz swoja grupe
          </span>
          <select
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              minWidth: 280,
            }}
          >
            {data.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} ({s.entries.length} zajec)
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', color: '#6B7280', fontSize: '0.85rem' }}>
          Sekcji: <strong>{data.sections.length}</strong> | Prowadzacych:{' '}
          <strong>{data.lecturers.length}</strong>
        </div>
      </div>

      {section && (
        <>
          <div
            style={{
              maxHeight: 360,
              overflow: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
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
                    style={{ borderTop: '1px solid #F3F4F6' }}
                  >
                    <Td>{e.date}</Td>
                    <Td>{e.time}</Td>
                    <Td>{e.subject}</Td>
                  </tr>
                ))}
                {section.entries.length === 0 && (
                  <tr>
                    <Td colSpan={3}>
                      <em style={{ color: '#9CA3AF' }}>
                        Brak wpisow dla tej grupy
                      </em>
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1rem',
              justifyContent: 'flex-end',
            }}
          >
            <button type="button" onClick={onCancel} style={btnSecondaryStyle}>
              Anuluj
            </button>
            <button
              type="button"
              onClick={() => onConfirm(section)}
              disabled={section.entries.length === 0}
              style={btnPrimaryStyle(section.entries.length === 0)}
            >
              Zapisz ({section.entries.length} zajec)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '0.5rem 0.75rem',
        textAlign: 'left',
        fontSize: '0.85rem',
        color: '#374151',
      }}
    >
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
    <td colSpan={colSpan} style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}>
      {children}
    </td>
  )
}

const btnPrimaryStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '0.6rem 1.2rem',
  background: disabled ? '#A5B4FC' : '#4F46E5',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
})

const btnSecondaryStyle: React.CSSProperties = {
  padding: '0.6rem 1.2rem',
  background: 'white',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: 8,
  fontWeight: 500,
  cursor: 'pointer',
}
