import type { ScheduleEntry } from '@syncu/types'
import { formatDDMM } from '../lib/week'

interface MonthGridProps {
  /** Dowolny dzien w wyswietlanym miesiacu (do rozpoznania ktore komorki sa "obce"). */
  monthDate: Date
  /** Wszystkie komorki gridu (5-6 tygodni, od poniedzialku do niedzieli). */
  gridDates: Date[]
  /** Wpisy planu pogrupowane po dacie "DD.MM". */
  entriesByDay: Map<string, ScheduleEntry[]>
  /** Klik w dzien -> przelaczenie na widok dnia z ta data. */
  onSelectDay: (date: Date) => void
}

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const MAX_VISIBLE = 3

/**
 * G-10: Widok miesieczny. Grid 7 kolumn x 5-6 wierszy, kazda komorka to
 * klikalny dzien z miniatura zajec (max 3 + "+X"). Klik -> Day view.
 */
export function MonthGrid({
  monthDate,
  gridDates,
  entriesByDay,
  onSelectDay,
}: MonthGridProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentMonth = monthDate.getMonth()

  return (
    <div>
      {/* Naglowki dni tygodnia */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-badge text-muted uppercase tracking-badge text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Siatka dni */}
      <div className="grid grid-cols-7 gap-1">
        {gridDates.map((date, i) => {
          const ddmm = formatDDMM(date)
          const dayEntries = (entriesByDay.get(ddmm) ?? [])
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time))
          const isToday = date.getTime() === today.getTime()
          const isOtherMonth = date.getMonth() !== currentMonth

          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(date)}
              className={[
                'flex flex-col gap-1 min-h-16 sm:min-h-24 p-1 sm:p-1.5 rounded-card-sm text-left transition-colors cursor-pointer',
                'border border-border-subtle hover:bg-surface-1',
                isOtherMonth ? 'bg-surface-1/40 opacity-60' : 'bg-white',
              ].join(' ')}
            >
              {/* Numer dnia */}
              <span
                className={[
                  'text-badge font-semibold leading-none self-start',
                  isToday
                    ? 'size-5 rounded-pill bg-primary text-on-primary flex items-center justify-center'
                    : 'text-heading',
                ].join(' ')}
              >
                {date.getDate()}
              </span>

              {dayEntries.length > 0 && (
                <>
                  {/* Mobile (< sm): kropki zamiast tytulow - kolumny za waskie */}
                  <div className="flex sm:hidden flex-wrap gap-0.5">
                    {dayEntries.slice(0, 4).map((_, j) => (
                      <span key={j} className="size-1.5 rounded-full bg-primary" />
                    ))}
                    {dayEntries.length > 4 && (
                      <span className="text-badge text-muted leading-none">+</span>
                    )}
                  </div>

                  {/* sm+ : pelne miniaturki z nazwa przedmiotu */}
                  <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden">
                    {dayEntries.slice(0, MAX_VISIBLE).map((e, j) => (
                      <span
                        key={j}
                        className="text-badge leading-tight truncate rounded-sm px-1 bg-primary-light text-primary-nav"
                        title={`${e.time} ${e.subject}`}
                      >
                        {e.subject}
                      </span>
                    ))}
                    {dayEntries.length > MAX_VISIBLE && (
                      <span className="text-badge text-muted px-1">
                        +{dayEntries.length - MAX_VISIBLE}
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
