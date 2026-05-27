import type { WeekEvent, ClassSessionType } from '@syncu/types';

export type ChangeStatus = 'new' | 'changed' | 'removed';

interface ScheduleCardProps {
  event: WeekEvent;
  column: number;
  rowStart: number;
  rowSpan: number;
  changeStatus?: ChangeStatus;
}

// Krotkie labelki - dziala w waskich kolumnach kalendarza bez ucinania.
// Pelne nazwy (Wykład, Projekt, Seminarium, Egzamin) sa za dlugie na badge
// w typowej kolumnie tygodnia.
const CHANGE_CONFIG: Record<ChangeStatus, { badge: string; label: string }> = {
  new:     { badge: 'bg-[rgb(16_185_129_/_.15)] text-success', label: 'Nowe'     },
  changed: { badge: 'bg-[rgb(217_119_6_/_.15)] text-warning',  label: 'Zmiana'   },
  removed: { badge: 'bg-danger/15 text-danger',                label: 'Usunięto' },
};

const TYPE_CONFIG: Record<ClassSessionType, { card: string; badge: string; label: string }> = {
  lecture: {
    card:  'bg-primary-light border-primary',
    badge: 'bg-primary/15 text-primary-nav',
    label: 'Wyk.',
  },
  lab: {
    card:  'bg-surface-2 border-muted',
    badge: 'bg-muted/15 text-muted',
    label: 'Lab',
  },
  project: {
    card:  'bg-surface-3 border-border-subtle',
    badge: 'bg-surface-1 text-heading',
    label: 'Proj.',
  },
  seminar: {
    card:  'bg-surface-1 border-border-subtle',
    badge: 'bg-surface-2 text-muted',
    label: 'Sem.',
  },
  exam: {
    card:  'bg-[rgba(168,56,54,0.08)] border-danger',
    badge: 'bg-danger/10 text-danger',
    label: 'Egz.',
  },
};

export function ScheduleCard({ event, column, rowStart, rowSpan, changeStatus }: ScheduleCardProps) {
  const cfg = TYPE_CONFIG[event.type];
  const chg = changeStatus ? CHANGE_CONFIG[changeStatus] : null;

  return (
    <div
      className={[
        'relative rounded-card-sm px-2 py-1.5 overflow-hidden min-w-0 z-10',
        'border-l-[3px] flex flex-col gap-px',
        cfg.card,
        changeStatus === 'removed' && 'opacity-50',
      ].filter(Boolean).join(' ')}
      style={{
        gridColumn: column + 2,
        gridRow: `${rowStart} / span ${rowSpan}`,
      }}
    >
      {/* Badge zmiany — prawy górny róg */}
      {chg && (
        <span className={[
          'absolute top-1 right-1 z-20',
          'text-badge font-bold uppercase tracking-badge rounded-pill px-1.5 leading-tight',
          chg.badge,
        ].join(' ')}>
          {chg.label}
        </span>
      )}

      {/* Wiersz: godziny + badge typu */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span className="text-badge text-muted tabular-nums shrink-0 leading-tight">
          {event.startTime}–{event.endTime}
        </span>
        <span className={[
          'text-badge font-bold uppercase tracking-badge rounded-pill px-1.5 leading-tight shrink-0',
          cfg.badge,
        ].join(' ')}>
          {cfg.label}
        </span>
      </div>

      {/* Nazwa przedmiotu - wrap do tylu linii ile pozwala wysokosc karty.
         Bez `line-clamp` / `truncate` -> nigdy nie ma "..." kropkowych.
         Co nie zmiesci sie pionowo, zostanie po prostu schowane przez
         `overflow-hidden` rodzica (wizualnie obciete bez "..."). */}
      <p className={[
        'text-badge font-bold leading-tight text-heading break-words',
        changeStatus === 'removed' && 'line-through',
      ].filter(Boolean).join(' ')}>
        {event.title}
      </p>

      {/* Sala */}
      {rowSpan >= 3 && event.room && (
        <p className="text-badge leading-tight truncate text-muted flex items-center gap-1">
          <RoomIcon />
          {event.room}
        </p>
      )}

      {/* Prowadzący */}
      {rowSpan >= 4 && event.lecturer && (
        <p className="text-badge leading-tight truncate text-muted flex items-center gap-1">
          <PersonIcon />
          {event.lecturer}
        </p>
      )}

      {/* Link Teams */}
      {rowSpan >= 3 && event.teamsLink && (
        <a
          href={event.teamsLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-auto flex items-center gap-1 text-badge font-medium text-primary-nav hover:underline w-fit"
        >
          <TeamsIcon />
          Dołącz
        </a>
      )}
    </div>
  );
}

function RoomIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 1C3.34 1 2 2.34 2 4c0 2.25 3 5 3 5s3-2.75 3-5c0-1.66-1.34-3-3-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="5" cy="4" r="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 9c0-1.93 1.57-3.5 3.5-3.5S8.5 7.07 8.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TeamsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="1" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity=".2" />
      <rect x="1" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 4.5h1a1.5 1.5 0 010 3H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 6h2M5 5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
