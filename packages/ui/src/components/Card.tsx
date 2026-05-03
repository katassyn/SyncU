import React from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'white' | 'primary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  surface: 'bg-surface-1 rounded-card-lg shadow-card-sm',
  white:   'bg-white rounded-card border border-border-subtle shadow-card',
  primary: 'bg-primary rounded-card-lg text-on-primary overflow-hidden',
};

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function Card({
  variant = 'surface',
  padding = 'lg',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
