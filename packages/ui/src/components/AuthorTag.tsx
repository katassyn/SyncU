import { cn } from '../lib/cn';

export type AuthorTagProps = {
  name: string;
  role?: string | null;
  className?: string;
};

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

export function AuthorTag({ name, role, className }: AuthorTagProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'shrink-0 size-6 rounded-full text-[10px] font-bold flex items-center justify-center select-none',
          avatarColor(name),
        )}
      >
        {initials(name)}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-badge font-medium text-heading">{name}</span>
        {role && <span className="text-[10px] text-muted mt-0.5">{role}</span>}
      </span>
    </span>
  );
}
