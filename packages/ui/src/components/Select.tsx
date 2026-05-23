import React from 'react';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  options?: SelectOption[];
}

export function Select({
  label,
  error,
  placeholder,
  options,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-caption font-bold text-body tracking-label uppercase"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full appearance-none bg-surface-1 rounded-pill text-ui text-heading',
            'border border-transparent cursor-pointer',
            'focus:outline-none focus:border-primary focus:bg-white',
            'transition-colors duration-150',
            'px-4 py-2.5 pr-10',
            error && 'border-danger focus:border-danger',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronIcon />
      </div>

      {error && (
        <p className="text-caption text-danger">{error}</p>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
