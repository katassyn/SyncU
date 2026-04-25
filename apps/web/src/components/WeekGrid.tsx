import type { ScheduleEntry } from '@syncu/types'
import { addDays, DAY_NAMES, DAY_NAMES_SHORT, formatDDMM } from '../lib/week'

type Props = {
  weekStart: Date
  entries: ScheduleEntry[]
}

/**
 * G-4: Siatka tygodnia. 7 kolumn (Pn-Nd). Kazda kolumna pokazuje
 * wpisy ScheduleEntry pasujace data DD.MM.
 *
 * Plan PK ma daty bez roku (np. "17.03"), wiec match'ujemy tylko DD.MM
 * z aktualnie wyswietlanym tygodniem.
 */
export function WeekGrid({ weekStart, entries }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Mapa "DD.MM" -> entries dla szybkiego lookupu
  const byDate = new Map<string, ScheduleEntry[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }
  // Posortuj kazdy dzien po godzinie startu
  for (const list of byDate.values()) {
    list.sort((a, b) => a.time.localeCompare(b.time))
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.5rem',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '0.5rem',
        background: '#FAFAFA',
      }}
    >
      {days.map((d, i) => {
        const ddmm = formatDDMM(d)
        const dayEntries = byDate.get(ddmm) ?? []
        const isToday = isSameDay(d, new Date())
        return (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: 6,
              border: isToday ? '2px solid #4F46E5' : '1px solid #E5E7EB',
              minHeight: 240,
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingBottom: '0.25rem',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <strong style={{ color: isToday ? '#4F46E5' : '#111827' }}>
                <span style={{ display: 'none' }}>{DAY_NAMES[i]}</span>
                {DAY_NAMES_SHORT[i]}
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                {ddmm}
              </span>
            </div>

            {dayEntries.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D1D5DB',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                }}
              >
                -
              </div>
            ) : (
              dayEntries.map((e, j) => <ClassEvent key={j} entry={e} />)
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClassEvent({ entry }: { entry: ScheduleEntry }) {
  return (
    <div
      style={{
        background: '#EEF2FF',
        border: '1px solid #C7D2FE',
        borderRadius: 6,
        padding: '0.4rem 0.5rem',
        fontSize: '0.78rem',
        lineHeight: 1.3,
      }}
      title={entry.subject}
    >
      <div style={{ fontWeight: 600, color: '#3730A3' }}>{entry.time}</div>
      <div style={{ color: '#1F2937', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        {entry.subject}
      </div>
    </div>
  )
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
