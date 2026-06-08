import { cn } from '../lib/cn';

export type MemberBadgeProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
};

const SIZE = {
  sm: { wrap: 'size-6 text-[10px]',  gap: 'gap-1.5', label: 'text-badge' },
  md: { wrap: 'size-8 text-[12px]',  gap: 'gap-2',   label: 'text-ui'   },
  lg: { wrap: 'size-10 text-[13px]', gap: 'gap-2.5', label: 'text-body' },
};

// 5-color palette cycling by first char code
const COLORS = [
  'bg-primary-light text-primary-nav',
  'bg-[rgba(192,122,32,.15)] text-[#c07a20]',
  'bg-[rgb(16_185_129_/_.15)] text-[#059669]',
  'bg-[rgb(168_56_54_/_.15)] text-danger',
  'bg-[rgb(65_98_128_/_.15)] text-[#416280]',
];

function avatarColor(name: string): string {
  return COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MemberBadge({
  name,
  size = 'md',
  showName = true,
  className,
}: MemberBadgeProps) {
  const s = SIZE[size];
  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 rounded-full font-bold flex items-center justify-center select-none',
          s.wrap,
          avatarColor(name),
        )}
      >
        {initials(name)}
      </span>
      {showName && (
        <span className={cn(s.label, 'font-medium text-heading truncate')}>
          {name}
        </span>
      )}
    </span>
  );
}
