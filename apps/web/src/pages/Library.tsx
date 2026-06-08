import { useState } from 'react';

// --------------- dane placeholder ---------------

const TABS = ['Wszystkie', 'Zapisane', 'Prywatne grupy'];

const featured = {
  title: 'Zaawansowana Mechanika Kwantowa — Kompendium',
  subject: 'Fizyka',
  author: 'dr hab. K. Wiśniewski',
  members: 12,
  saved: true,
  description: 'Kompleksowe notatki z wykładów, zadania i rozwiązania. Idealne do przygotowania do egzaminu.',
};

const resources = [
  { id: 1, title: 'Chemia Organiczna II',          subject: 'Chemia',        author: 'Anna M.',   members: 8,  kind: 'NOTATKI',       color: 'bg-[rgba(27,104,113,.12)] text-primary-nav' },
  { id: 2, title: 'Historia Architektury',          subject: 'Architektura',  author: 'Piotr K.',  members: 5,  kind: 'PREZENTACJA',   color: 'bg-[rgba(192,122,32,.12)] text-[#c07a20]'   },
  { id: 3, title: 'Struktury Danych i Algorytmy',  subject: 'Informatyka',   author: 'Marek S.',  members: 15, kind: 'NOTATKI',       color: 'bg-surface-2 text-muted'                    },
  { id: 4, title: 'Makroekonomia II',              subject: 'Ekonomia',      author: 'Julia W.',  members: 9,  kind: 'ĆWICZENIA',     color: 'bg-primary-light text-primary-nav'          },
];

// --------------- komponenty ---------------

function ResourceCard({ res }: { res: typeof resources[number] }) {
  return (
    <div className="bg-white rounded-card-lg shadow-card-sm overflow-hidden flex flex-col hover:shadow-card transition-shadow cursor-pointer">
      {/* Placeholder obrazka */}
      <div className={['h-32 flex items-center justify-center', res.color].join(' ')}>
        <NotesIcon />
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-badge font-bold uppercase tracking-badge bg-primary-light text-primary-nav rounded-pill px-2 py-0.5">
            {res.subject}
          </span>
          <span className="text-badge font-bold uppercase tracking-badge text-muted">
            {res.kind}
          </span>
        </div>

        <p className="text-body font-semibold text-heading m-0 leading-snug line-clamp-2">
          {res.title}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-badge text-muted">{res.author}</span>
          <span className="flex items-center gap-1 text-badge text-muted">
            <MembersIcon />
            {res.members}
          </span>
        </div>
      </div>
    </div>
  );
}

// --------------- main ---------------

export default function Library() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">

      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-display font-extrabold text-heading m-0 leading-none">
            Biblioteka Notatek
          </p>
          <p className="text-body text-muted mt-2 mb-0">
            Przeglądaj wspólne zasoby, notatki z wykładów i materiały badawcze od społeczności akademickiej.
          </p>
        </div>
        <button className="shrink-0 flex items-center gap-2 bg-primary text-on-primary text-ui font-semibold rounded-pill px-5 py-2.5 hover:opacity-90 transition-opacity cursor-pointer">
          <PlusIcon />
          Utwórz notatkę
        </button>
      </div>

      {/* Zakładki */}
      <div className="flex items-center gap-1 border-b border-border-subtle mb-6 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={[
              'shrink-0 whitespace-nowrap px-4 py-2.5 text-ui font-medium transition-colors cursor-pointer rounded-t-card-sm',
              activeTab === i
                ? 'text-primary-nav border-b-2 border-primary-nav -mb-px bg-transparent'
                : 'text-muted hover:text-heading hover:bg-surface-1',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Wyróżniony zasób + karta boczna */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Featured — 2 kolumny */}
        <div className="lg:col-span-2 bg-white rounded-card-lg shadow-card-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-card transition-shadow">
          <div className="h-48 bg-primary-light flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
            <div className="relative z-10">
              <LargeNotesIcon />
            </div>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-badge font-bold uppercase tracking-badge bg-primary-light text-primary-nav rounded-pill px-2 py-0.5">
                {featured.subject}
              </span>
              {featured.saved && (
                <span className="text-badge font-bold uppercase tracking-badge bg-surface-2 text-muted rounded-pill px-2 py-0.5">
                  Zapisane
                </span>
              )}
            </div>
            <p className="text-h3 font-bold text-heading m-0">{featured.title}</p>
            <p className="text-ui text-muted m-0">{featured.description}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-badge text-muted">{featured.author}</span>
              <span className="flex items-center gap-1 text-badge text-muted">
                <MembersIcon />
                {featured.members} członków
              </span>
            </div>
          </div>
        </div>

        {/* Karta boczna — Makroekonomia */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-card-lg shadow-card-sm p-5 flex flex-col gap-3 cursor-pointer hover:shadow-card transition-shadow flex-1">
            <div className="size-12 rounded-card-sm bg-primary-light text-primary-nav flex items-center justify-center">
              <NotesIcon />
            </div>
            <div>
              <span className="text-badge font-bold uppercase tracking-badge bg-primary-light text-primary-nav rounded-pill px-2 py-0.5">
                Ekonomia
              </span>
            </div>
            <p className="text-h3 font-bold text-heading m-0">Makroekonomia II</p>
            <p className="text-ui text-muted m-0">Notatki z ćwiczeń, modele ekonomiczne i zestaw zadań egzaminacyjnych.</p>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-subtle">
              <span className="flex items-center gap-1 text-badge text-muted">
                <MembersIcon />
                9 członków
              </span>
              <button className="text-badge font-bold text-primary-nav hover:underline cursor-pointer">
                Otwórz →
              </button>
            </div>
          </div>

          <div className="bg-primary-light rounded-card-lg p-5 flex flex-col gap-2">
            <p className="text-ui font-bold text-primary-nav m-0">Zaproś znajomych</p>
            <p className="text-badge text-muted m-0">Podziel się notatkami ze swoją grupą.</p>
            <button className="mt-1 bg-primary text-on-primary text-badge font-bold rounded-pill px-4 py-2 w-fit hover:opacity-90 transition-opacity cursor-pointer">
              Zaproś
            </button>
          </div>
        </div>
      </div>

      {/* Siatka zasobów */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        {resources.map(r => <ResourceCard key={r.id} res={r} />)}
      </div>

    </div>
  );
}

// --------------- ikony ---------------

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2v4h4M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LargeNotesIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 4h17l11 11v29a2 2 0 01-2 2H12a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-primary" />
      <path d="M29 4v11h11M16 24h16M16 31h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
    </svg>
  );
}

function MembersIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="4.5" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 10c0-1.93 1.57-3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 10c0-1.93-1.57-3.5-3.5-3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
