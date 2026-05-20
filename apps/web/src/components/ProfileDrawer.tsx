interface ProfileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ open, onClose }: ProfileDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 bg-heading/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Profil użytkownika"
        className={[
          'fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-fab',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <span className="text-h3 font-bold text-primary-nav tracking-tight">SyncU</span>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="p-2 rounded-card-sm text-muted hover:text-heading hover:bg-surface-1 transition-colors cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-4 px-6 py-6 border-b border-border-subtle">
          <div className="size-14 rounded-pill border-2 border-primary/10 bg-primary-light text-primary-nav font-bold text-h3 flex items-center justify-center shrink-0">
            A
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-body font-bold text-heading truncate">Alex Student</span>
            <span className="text-ui text-muted truncate">alex@university.edu</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-col gap-1 px-3 py-4 border-b border-border-subtle">
          <a
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-body font-medium text-heading hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Profil
          </a>
          <a
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-body font-medium text-heading hover:bg-surface-2 transition-colors cursor-pointer"
          >
            Ustawienia
          </a>
        </div>

        {/* Footer */}
        <div className="mt-auto px-3 py-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-body font-medium text-danger hover:bg-[rgb(168_56_54_/_.08)] transition-colors cursor-pointer">
            Wyloguj się
          </button>
        </div>
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
