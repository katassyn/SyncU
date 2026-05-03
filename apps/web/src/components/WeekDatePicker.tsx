import { addDays, formatWeekLabel, startOfWeek } from '../lib/week'

type Props = {
  weekStart: Date
  onChange: (newStart: Date) => void
}

const btn: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  background: 'white',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: 6,
  fontWeight: 500,
  cursor: 'pointer',
}

/**
 * G-4: Date picker tygodnia (prev / Dzis / next).
 */
export function WeekDatePicker({ weekStart, onChange }: Props) {
  const prev = () => onChange(addDays(weekStart, -7))
  const next = () => onChange(addDays(weekStart, 7))
  const today = () => onChange(startOfWeek(new Date()))

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <button type="button" onClick={prev} style={btn} aria-label="Poprzedni tydzien">
        ←
      </button>
      <button type="button" onClick={today} style={btn}>
        Dzis
      </button>
      <button type="button" onClick={next} style={btn} aria-label="Nastepny tydzien">
        →
      </button>
      <span
        style={{
          marginLeft: '0.75rem',
          fontWeight: 600,
          color: '#111827',
        }}
      >
        {formatWeekLabel(weekStart)}
      </span>
    </div>
  )
}
