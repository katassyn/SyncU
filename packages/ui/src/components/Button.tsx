import React from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-on-primary font-bold tracking-label uppercase hover:bg-primary-dark active:bg-primary-dark disabled:opacity-50',
  secondary:
    'bg-surface-3 text-heading font-medium hover:bg-surface-2 active:bg-surface-2 disabled:opacity-50',
  ghost:
    'text-primary font-bold tracking-label uppercase hover:text-primary-dark active:text-primary-dark disabled:opacity-40',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-4 py-2 text-badge rounded-pill',
  md: 'px-5 py-2.5 text-ui rounded-pill',
  lg: 'px-6 py-4 text-ui rounded-pill',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
