import React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leadingIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-caption font-bold text-body tracking-label uppercase"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-surface-1 rounded-pill text-ui text-heading placeholder:text-muted',
            'border border-transparent',
            'focus:outline-none focus:border-primary focus:bg-white',
            'transition-colors duration-150',
            leadingIcon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5',
            error && 'border-danger focus:border-danger',
            className,
          )}
          {...props}
        />
      </div>

      {error && (
        <p className="text-caption text-danger">{error}</p>
      )}
    </div>
  );
}
