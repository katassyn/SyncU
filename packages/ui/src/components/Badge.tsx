import React from 'react';
import { cn } from '../lib/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'exam' | 'study' | 'colloquium';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:    'bg-surface-3 text-body',
  primary:    'bg-primary-light text-primary-nav',
  exam:       'bg-[rgb(168_56_54_/_.15)] text-danger',
  study:      'bg-[rgb(65_98_128_/_.15)] text-navy-dark',
  colloquium: 'bg-primary-subtle text-heading',
};

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1',
        'text-badge font-bold tracking-badge uppercase',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
