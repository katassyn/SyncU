import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getUserInitial } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';

interface TopBarProps {
  onProfileClick: () => void;
}

const NAV_LINKS = [
  { to: '/today',    label: 'Dashboard' },
  { to: '/week',     label: 'Kalendarz' },
  { to: '/subjects', label: 'Przedmioty' },
  { to: '/exams',    label: 'Kolokwia' },
  { to: '/library',  label: 'Grupy' },
] as const;

export function TopBar({ onProfileClick }: TopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const auth = useAuth();
  const user = auth.kind === 'authenticated' ? auth.user : null;

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'font-semibold text-ui sm:text-body border-b-2 pb-1.5 transition-colors whitespace-nowrap',
      isActive
        ? 'text-primary-nav border-primary-nav'
        : 'text-nav border-transparent hover:text-primary-nav hover:border-primary-nav/40',
    ].join(' ');

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center px-6 py-4 text-body font-semibold border-l-[3px] transition-colors',
      isActive
        ? 'text-primary-nav border-primary-nav bg-primary-light'
        : 'text-heading border-transparent hover:text-primary-nav hover:bg-surface-1',
    ].join(' ');

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 backdrop-blur-sm bg-white/80 shadow-card-sm">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-11 py-3 sm:py-4">

          {/* Hamburger — mobile only */}
          <button
            aria-label="Otwórz menu"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-card-sm text-heading hover:bg-surface-1 transition-colors cursor-pointer"
          >
            <HamburgerIcon />
          </button>

          {/* Navigation — desktop */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 xl:gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLinkClass}>{label}</NavLink>
            ))}
          </nav>

          {/* Right — avatar + brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onProfileClick}
              aria-label="Otwórz profil"
              className="size-8 sm:size-9 rounded-pill border-2 border-primary/10 bg-primary-light text-primary-nav font-bold text-caption flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer"
            >
              {getUserInitial(user)}
            </button>
            <span className="hidden sm:block text-h3 font-bold text-primary-nav tracking-tight">
              SyncU
            </span>
          </div>

        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-white shadow-card flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-border-subtle shrink-0">
              <span className="text-h3 font-bold text-primary-nav tracking-tight">SyncU</span>
              <button
                aria-label="Zamknij menu"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-card-sm text-muted hover:text-heading hover:bg-surface-1 transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col py-2 flex-1">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={drawerLinkClass}
                  onClick={() => setDrawerOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

