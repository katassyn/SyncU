import { cn } from '../lib/cn';

export type FileCardStatus = 'idle' | 'uploading' | 'done' | 'error';

export type FileCardProps = {
  fileName: string;
  fileSize?: number;
  status?: FileCardStatus;
  progress?: number;
  errorMessage?: string;
  onRemove?: () => void;
  className?: string;
};

// ---- helpers ----------------------------------------------------------------

function ext(name: string): string {
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_COLORS: Record<string, string> = {
  xlsx: 'bg-[rgb(16_185_129_/_.12)] text-[#059669]',
  xls:  'bg-[rgb(16_185_129_/_.12)] text-[#059669]',
  pdf:  'bg-[rgb(168_56_54_/_.12)]  text-[#a83836]',
  doc:  'bg-primary-light            text-primary-nav',
  docx: 'bg-primary-light            text-primary-nav',
  png:  'bg-[rgba(124,58,237,.12)]  text-[#7c3aed]',
  jpg:  'bg-[rgba(124,58,237,.12)]  text-[#7c3aed]',
  jpeg: 'bg-[rgba(124,58,237,.12)]  text-[#7c3aed]',
  gif:  'bg-[rgba(124,58,237,.12)]  text-[#7c3aed]',
};

// ---- icons ------------------------------------------------------------------

function FileIcon({ extension }: { extension: string }) {
  const isSheet = ['xlsx', 'xls'].includes(extension);
  const isPdf   = extension === 'pdf';
  const isImg   = ['png', 'jpg', 'jpeg', 'gif'].includes(extension);
  const label   = extension.toUpperCase().slice(0, 4);

  if (isSheet) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6M8 13h2m2 0h2M8 17h2m2 0h2" />
    </svg>
  );

  if (isPdf) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6M9 13c0-.6.4-1 1-1h1a1 1 0 010 2h-1v1h1m3-3h1.5a1 1 0 010 2H14v1m3-3v3" />
    </svg>
  );

  if (isImg) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );

  // generic document with label overlay
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 2v6h6" />
      <text x="12" y="18" textAnchor="middle" fontSize="5" fontWeight="700" stroke="none" fill="currentColor" style={{ fontFamily: 'sans-serif' }}>{label}</text>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 shrink-0">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4 shrink-0">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ---- component --------------------------------------------------------------

export function FileCard({
  fileName,
  fileSize,
  status = 'idle',
  progress = 0,
  errorMessage,
  onRemove,
  className,
}: FileCardProps) {
  const extension  = ext(fileName);
  const colorClass = FILE_COLORS[extension] ?? 'bg-surface-2 text-muted';
  const isError    = status === 'error';

  return (
    <div
      className={cn(
        'group relative bg-white rounded-card-sm border transition-shadow',
        isError ? 'border-danger/40' : 'border-border-subtle',
        'hover:shadow-card-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* file type icon */}
        <span className={cn('shrink-0 size-9 rounded-card-sm flex items-center justify-center p-2', colorClass)}>
          <FileIcon extension={extension} />
        </span>

        {/* name + size / error */}
        <div className="flex-1 min-w-0">
          <p className="text-ui font-medium text-heading m-0 truncate leading-tight">
            {fileName}
          </p>
          {isError && errorMessage ? (
            <p className="text-badge text-danger m-0 mt-0.5">{errorMessage}</p>
          ) : fileSize != null ? (
            <p className="text-badge text-muted m-0 mt-0.5">{formatSize(fileSize)}</p>
          ) : null}
        </div>

        {/* status indicator */}
        <div className="shrink-0 flex items-center gap-2">
          {status === 'uploading' && <span className="text-primary"><SpinnerIcon /></span>}
          {status === 'done'      && <span className="text-success"><CheckIcon /></span>}
          {status === 'error'     && <span className="text-danger"><XIcon /></span>}

          {onRemove && (
            <button
              onClick={onRemove}
              aria-label="Usuń plik"
              className={cn(
                'p-1 rounded-card-sm text-muted hover:text-heading hover:bg-surface-2 transition-colors cursor-pointer',
                status === 'uploading' ? 'opacity-40 pointer-events-none' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* progress bar */}
      {status === 'uploading' && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-surface-2 rounded-b-card-sm overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-b-card-sm"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
