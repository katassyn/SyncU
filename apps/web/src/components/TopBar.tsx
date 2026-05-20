import { NavLink } from 'react-router-dom';

interface TopBarProps {
  onProfileClick: () => void;
}

export function TopBar({ onProfileClick }: TopBarProps) {
  const navLinkBase =
    'font-semibold text-ui sm:text-body border-b-2 pb-1.5 transition-colors whitespace-nowrap'
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${navLinkBase} ${
      isActive
        ? 'text-primary-nav border-primary-nav'
        : 'text-nav border-transparent hover:text-primary-nav hover:border-primary-nav/40'
    }`;

  return (
    <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-sm bg-white/80 shadow-card-sm">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-11 py-3 sm:py-4">

        {/* Left — search (ukryte na mobile) */}
        <div className="hidden md:flex flex-1 max-w-sm lg:max-w-[448px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Szukaj zasobów, notatek..."
            className="w-full bg-surface-1 rounded-pill pl-9 pr-4 py-2 text-ui text-heading placeholder:text-muted focus:outline-none focus:bg-white focus:border focus:border-primary transition-colors"
          />
        </div>

        {/* Center — navigation */}
        <nav className="flex items-center gap-4 sm:gap-6 lg:gap-8 mx-auto md:mx-0">
          <NavLink to="/today"   className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/week"    className={navLinkClass}>Kalendarz</NavLink>
          <NavLink to="/library" className={navLinkClass}>Grupy</NavLink>
        </nav>

        {/* Right — actions + avatar + brand */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <button aria-label="Powiadomienia" className="p-2 rounded-card-sm text-muted hover:text-heading hover:bg-surface-1 transition-colors cursor-pointer">
              <BellIcon />
            </button>
            <button aria-label="Ustawienia" className="p-2 rounded-card-sm text-muted hover:text-heading hover:bg-surface-1 transition-colors cursor-pointer">
              <SettingsIcon />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 sm:pl-4 lg:pl-6 sm:border-l sm:border-border-subtle">
            <button
              onClick={onProfileClick}
              aria-label="Otwórz profil"
              className="size-8 sm:size-9 rounded-pill border-2 border-primary/10 bg-primary-light text-primary-nav font-bold text-caption flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer"
            >
              A
            </button>
            <span className="hidden sm:block text-h3 font-bold text-primary-nav tracking-tight">
              SyncU
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2a5 5 0 00-5 5v2.5L2.5 11.5h13L14 9.5V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7.5 14.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
