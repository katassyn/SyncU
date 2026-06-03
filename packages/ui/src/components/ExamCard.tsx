export type ExamCardProps = {
  courseName: string;
  date: string | Date;
  scope?: string | null;
};

type Urgency = 'past' | 'soon' | 'warning' | 'ok';

function getCountdown(date: Date): { label: string; urgency: Urgency } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)   return { label: 'Minął',              urgency: 'past'    };
  if (diffDays === 0) return { label: 'Dziś',               urgency: 'soon'    };
  if (diffDays === 1) return { label: 'Jutro',              urgency: 'soon'    };
  if (diffDays <= 7)  return { label: `Za ${diffDays} dni`, urgency: 'warning' };
  return                     { label: `Za ${diffDays} dni`, urgency: 'ok'      };
}

const borderColor: Record<Urgency, string> = {
  past:    'border-muted',
  soon:    'border-danger',
  warning: 'border-warning',
  ok:      'border-primary',
};

const countdownColor: Record<Urgency, string> = {
  past:    'text-muted',
  soon:    'text-danger',
  warning: 'text-warning',
  ok:      'text-primary-nav',
};

export function ExamCard({ courseName, date, scope }: ExamCardProps) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { label, urgency } = getCountdown(d);
  const dateFormatted = d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

  return (
    <div className={['border-l-[3px] pl-3 py-2', borderColor[urgency]].join(' ')}>
      <p className="text-body font-semibold text-heading m-0 leading-tight line-clamp-2">
        {courseName}
      </p>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="text-badge text-muted">{dateFormatted}</span>
        <span className="text-badge text-muted">·</span>
        <span className={['text-badge font-bold', countdownColor[urgency]].join(' ')}>{label}</span>
      </div>
      {scope && (
        <p className="text-badge text-muted m-0 mt-0.5 leading-tight line-clamp-1">{scope}</p>
      )}
    </div>
  );
}
