import React from 'react';
import { cn } from '../lib/cn';

export type UploadDropzoneProps = {
  dragActive?: boolean;
  loading?: boolean;
  loadingText?: string;
  acceptLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  children?: React.ReactNode;
  className?: string;
};

function UploadIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="size-10 shrink-0">
      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
      <path d="M20 26V14M14 20l6-6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin size-8 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function UploadDropzone({
  dragActive = false,
  loading = false,
  loadingText = 'Przetwarzanie...',
  acceptLabel,
  disabled = false,
  onClick,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
  className,
}: UploadDropzoneProps) {
  const isDisabled = disabled || loading;

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={isDisabled ? undefined : (e) => e.key === 'Enter' && onClick?.()}
      onDragEnter={isDisabled ? undefined : onDragEnter}
      onDragOver={isDisabled ? undefined : onDragOver}
      onDragLeave={isDisabled ? undefined : onDragLeave}
      onDrop={isDisabled ? undefined : onDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3',
        'border-2 border-dashed rounded-card-lg px-8 py-12 text-center',
        'transition-colors duration-150 select-none',
        isDisabled
          ? 'cursor-default opacity-70'
          : 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        dragActive
          ? 'border-primary bg-primary-light'
          : 'border-border-subtle bg-surface-1 hover:border-primary/50 hover:bg-surface-2',
        className,
      )}
    >
      {loading ? (
        <>
          <span className="text-primary"><SpinnerIcon /></span>
          <p className="text-body text-muted m-0">{loadingText}</p>
        </>
      ) : (
        <>
          <span className={cn('transition-colors', dragActive ? 'text-primary' : 'text-muted')}>
            <UploadIcon />
          </span>
          <div>
            <p className={cn('text-h3 font-semibold m-0 transition-colors', dragActive ? 'text-primary-nav' : 'text-heading')}>
              {dragActive ? 'Upuść plik tutaj' : 'Upuść plik albo kliknij, żeby wybrać'}
            </p>
            {acceptLabel && (
              <p className="text-ui text-muted m-0 mt-1">{acceptLabel}</p>
            )}
          </div>
        </>
      )}

      {/* hidden file input goes here via children */}
      {children}
    </div>
  );
}
