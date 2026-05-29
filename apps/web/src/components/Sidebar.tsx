import { NavLink } from 'react-router-dom';

// G-11: Focus Mode i Biblioteka usuniete z nawigacji (decyzja zespolu 14.05).
// /library nadal istnieje jako route ("Grupy" w Topbar), tylko nie ma go w sidebar.
const navItems = [
  { label: 'Kalendarz',   href: '/week',     icon: <WeekIcon /> },
  { label: 'Przedmioty',  href: '/subjects', icon: <SubjectsIcon /> },
];

export function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 z-30 h-full w-60 bg-white border-r border-border-subtle flex flex-col pt-[57px]">
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ label, href, icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-body font-medium transition-colors',
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'text-heading hover:bg-surface-2',
              ].join(' ')
            }
          >
            <span className="shrink-0 size-[18px] flex items-center justify-center">
              {icon}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border-subtle">
        <NavLink
          to="/import"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-card-sm text-body font-medium transition-colors',
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-muted hover:bg-surface-1 hover:text-heading',
            ].join(' ')
          }
        >
          <span className="shrink-0 size-[18px] flex items-center justify-center">
            <ImportIcon />
          </span>
          Import planu
        </NavLink>
      </div>
    </aside>
  );
}


function WeekIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <rect x="2" y="3" width="14" height="13" rx="2" />
      <path d="M2 7h14M6 2v2M12 2v2M5 11h2M8 11h2M11 11h2" />
    </svg>
  );
}

function SubjectsIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M3 4h9a2 2 0 012 2v8a2 2 0 01-2 2H3V4z" />
      <path d="M12 4a2 2 0 012 2v8" />
      <path d="M6 8h5M6 11h3" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-full">
      <path d="M9 2v9M6 8l3 3 3-3" />
      <path d="M3 13v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
    </svg>
  );
}
