import { NavLink } from 'react-router-dom'
import { PageShell } from './PageShell'

/**
 * G-3 #1: Empty state na /today - dopoki user nie zaimportowal planu,
 * pokazujemy zaproszenie z CTA prowadzacym na /import.
 *
 * Pozniej (po podpieciu API od Kamila) ten warunek zamieni sie na faktyczny
 * fetch zajec dnia - i empty state bedzie widoczny tylko gdy backend zwroci [].
 */
export default function Today() {
  // TODO: podpiac pod API gdy bedzie GET /timetable/today
  const hasImportedPlan = false
  const todaysClasses: unknown[] = []

  if (!hasImportedPlan || todaysClasses.length === 0) {
    return (
      <PageShell
        title="Today"
        subtitle="Zajecia dnia + najblizsze kolokwia + zadania nauki"
      >
        <div
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            padding: '3rem 2rem',
            textAlign: 'center',
            background: '#FAFAFA',
          }}
        >
          <h2 style={{ marginTop: 0, color: '#111827' }}>
            Brak zaplanowanych zajec
          </h2>
          <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
            Wgraj plan zajec z Excela, zeby zobaczyc co masz dzisiaj na uczelni.
          </p>
          <NavLink
            to="/import"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#4F46E5',
              color: 'white',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Zaimportuj plan
          </NavLink>
        </div>
      </PageShell>
    )
  }

  // Tu pojdzie lista zajec dnia (G-4 / podpiecie pod backend)
  return (
    <PageShell
      title="Today"
      subtitle="Zajecia dnia + najblizsze kolokwia + zadania nauki"
    />
  )
}
