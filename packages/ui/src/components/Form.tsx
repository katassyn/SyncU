import React from 'react'
import { cn } from '../lib/cn'

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
}

export function Form({ className, children, ...props }: FormProps) {
  return (
    <form className={cn('flex flex-col gap-4', className)} {...props}>
      {children}
    </form>
  )
}

export interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  htmlFor?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  error,
  hint,
  htmlFor,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-caption font-bold text-body tracking-label uppercase"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-caption text-muted">{hint}</p>
      )}
      {error && (
        <p className="text-caption text-danger">{error}</p>
      )}
    </div>
  )
}
