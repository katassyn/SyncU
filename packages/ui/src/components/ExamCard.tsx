  import React, { useMemo } from 'react';
import { cn } from '../lib/cn';
import { Badge } from './Badge';

export interface ExamCardProps extends React.HTMLAttributes<HTMLDivElement> {
  subject: string;
  date: string | Date;
  scope?: string;
  type?: 'exam' | 'colloquium';
  room?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Urgency = 'past' | 'soon' | 'warning' | 'ok';

function getCountdown(date: Date): { label: string; urgency: Urgency } {
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)   return { label: 'Minął',              urgency: 'past'    };
  if (diffDays === 0) return { label: 'Dziś',               urgency: 'soon'    };
  if (diffDays === 1) return { label: 'Jutro',              urgency: 'soon'    };
  if (diffDays <= 7)  return { label: `Za ${diffDays} dni`, urgency: 'warning' };
  return                     { label: `Za ${diffDays} dni`, urgency: 'ok'      };
}

const urgencyClasses: Record<Urgency, string> = {
  past:    'text-muted',
  soon:    'text-danger',
  warning: 'text-warning',
  ok:      'text-primary-nav',
};

export function ExamCard({
  subject,
  date,
  scope,
  type = 'exam',
  room,
  className,
  ...props
}: ExamCardProps) {
  const dateObj  = useMemo(() => (date instanceof Date ? date : new Date(date)), [date]);
  const countdown = useMemo(() => getCountdown(dateObj), [dateObj]);

  return (
    <div
      className={cn(
        'bg-white rounded-card border border-border-subtle shadow-card',
        'p-5 flex flex-col gap-3',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-body font-bold text-heading leading-snug">{subject}</span>
        <Badge variant={type === 'exam' ? 'exam' : 'colloquium'} className="shrink-0">
          {type === 'exam' ? 'Egzamin' : 'Kolokwium'}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-ui text-muted">
        <CalendarIcon />
        <span>{formatDate(dateObj)}</span>
        {room && <span>· {room}</span>}
      </div>

      <div className="border-t border-border-subtle" />

      <div className="flex items-start justify-between gap-4">
        <span className={cn('text-ui font-bold', urgencyClasses[countdown.urgency])}>
          {countdown.label}
        </span>
        {scope && (
          <p className="text-ui text-muted text-right leading-snug max-w-[60%]">{scope}</p>
        )}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
