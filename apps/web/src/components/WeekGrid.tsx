import type { WeekEvent, ClassSessionType } from '@syncu/types';

interface WeekGridProps {
  events: WeekEvent[];
  weekDates: Date[];
}

const HOUR_START = 8;
const HOUR_END = 20;
const SLOTS = (HOUR_END - HOUR_START) * 2;

function timeToRow(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h - HOUR_START) * 2 + Math.floor(m / 30) + 2;
}

function timeDurationInSlots(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 30;
}

const TYPE_STYLES: Record<ClassSessionType, string> = {
  lecture:  'bg-primary-light text-primary-nav border-l-[3px] border-primary',
  lab:      'bg-surface-2 text-heading border-l-[3px] border-muted',
  project:  'bg-surface-3 text-heading border-l-[3px] border-border-subtle',
  seminar:  'bg-surface-1 text-heading border-l-[3px] border-border-subtle',
  exam:     'bg-[rgba(168,56,54,0.08)] text-danger border-l-[3px] border-danger',
};

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

interface ScheduleCardProps {
  event: WeekEvent;
  column: number;
}

function ScheduleCard({ event, column }: ScheduleCardProps) {
  const rowStart = timeToRow(event.startTime);
  const rowSpan = Math.max(1, timeDurationInSlots(event.startTime, event.endTime));

  return (
    <div
      className={[
        'rounded-card-sm px-2 py-1.5 overflow-hidden min-w-0 z-10',
        TYPE_STYLES[event.type],
      ].join(' ')}
      style={{
        gridColumn: column + 2,
        gridRow: `${rowStart} / span ${rowSpan}`,
      }}
    >
      <p className="text-badge font-bold leading-tight truncate">{event.title}</p>
      {event.room && (
        <p className="text-badge leading-tight truncate opacity-70">{event.room}</p>
      )}
    </div>
  );
}

export function WeekGrid({ events, weekDates }: WeekGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{
          gridTemplateColumns: `4rem repeat(7, minmax(0, 1fr))`,
          gridTemplateRows: `3rem repeat(${SLOTS}, 1.75rem)`,
        }}
      >
        {/* Corner spacer */}
        <div style={{ gridColumn: 1, gridRow: 1 }} />

        {/* Day headers */}
        {weekDates.map((date, i) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          const isToday = d.getTime() === today.getTime();
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-center border-b border-border-subtle"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className="text-badge text-muted uppercase tracking-badge">
                {DAY_LABELS[i]}
              </span>
              <span
                className={[
                  'text-ui font-semibold leading-none mt-0.5',
                  isToday
                    ? 'size-6 rounded-pill bg-primary text-on-primary flex items-center justify-center'
                    : 'text-heading',
                ].join(' ')}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}

        {/* Hour labels */}
        {hours.map((hour, i) => {
          const rowIndex = i * 2 + 2;
          return (
            <div
              key={hour}
              className="flex items-start justify-end pr-3 pt-0.5"
              style={{ gridColumn: 1, gridRow: `${rowIndex} / span 2` }}
            >
              <span className="text-badge text-muted tabular-nums">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          );
        })}

        {/* Horizontal grid lines (full-hour solid, half-hour dashed) */}
        {Array.from({ length: SLOTS }, (_, i) => (
          <div
            key={i}
            className={
              i % 2 === 0
                ? 'border-t border-border-subtle'
                : 'border-t border-dashed border-border-subtle/40'
            }
            style={{ gridColumn: '2 / -1', gridRow: i + 2 }}
          />
        ))}

        {/* Vertical column separators */}
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="border-l border-border-subtle"
            style={{
              gridColumn: i + 2,
              gridRow: `1 / span ${SLOTS + 1}`,
            }}
          />
        ))}

        {/* Events */}
        {events.map((event) => (
          <ScheduleCard key={event.id} event={event} column={event.day} />
        ))}
      </div>
    </div>
  );
}
