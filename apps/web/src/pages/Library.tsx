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

const recentContributions = [
  { id: 1, title: 'Quantum Tunneling — Notatki',     author: 'Jan K.',    when: '2 godz. temu' },
  { id: 2, title: 'Etyka AI — Mapa myśli',           author: 'Zespół',    when: '5 godz. temu' },
  { id: 3, title: 'Algorytmy — Zestaw ćwiczeń',      author: 'Anna M.',   when: 'wczoraj'      },
  { id: 4, title: 'Makroekonomia — Podsumowanie',    author: 'Julia W.',  when: 'wczoraj'      },
];

const trendingSubjects = [
  { id: 1, name: 'Uczenie maszynowe',      count: 42 },
  { id: 2, name: 'Obliczenia kwantowe',    count: 38 },
  { id: 3, name: 'Etyka w AI',             count: 31 },
  { id: 4, name: 'Architektura systemów',  count: 27 },
  { id: 5, name: 'Bazy danych',            count: 19 },
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
    <div className="px-8 py-8">

      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-4 mb-6">
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
      <div className="flex items-center gap-1 border-b border-border-subtle mb-6">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={[
              'px-4 py-2.5 text-ui font-medium transition-colors cursor-pointer rounded-t-card-sm',
              activeTab === i
                ? 'text-primary-nav border-b-2 border-primary-nav -mb-px bg-transparent'
                : 'text-muted hover:text-heading',
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

      {/* Research Hub banner */}
      <div className="bg-primary rounded-card-lg p-8 mb-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-h2 font-bold text-on-primary m-0">
            Międzyuczelniany Hub Badawczy
          </p>
          <p className="text-ui text-on-primary/70 m-0">
            Dołącz do ponad 200 badaczy z różnych uczelni. Dziel się wynikami, współpracuj nad projektami i buduj sieć kontaktów akademickich.
          </p>
          <div className="flex items-center gap-2 mt-1">
            {/* Avatary */}
            {['A', 'B', 'C', 'D'].map((l, i) => (
              <div
                key={i}
                className="size-8 rounded-pill bg-on-primary/20 text-on-primary text-badge font-bold flex items-center justify-center -ml-2 first:ml-0 border-2 border-primary"
              >
                {l}
              </div>
            ))}
            <span className="text-badge text-on-primary/70 ml-2">+200 badaczy</span>
          </div>
        </div>
        <button className="shrink-0 bg-white text-primary-nav font-bold text-ui rounded-pill px-6 py-3 hover:bg-primary-light transition-colors cursor-pointer">
          Dołącz do Hubu
        </button>
      </div>

      {/* Dół: Recent + Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Ostatnie wkłady */}
        <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-h3 font-bold text-heading m-0">Ostatnie wkłady</p>
            <button className="text-badge font-bold text-primary-nav hover:underline cursor-pointer">
              Zobacz wszystkie
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {recentContributions.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-card-sm bg-primary-light text-primary-nav flex items-center justify-center shrink-0">
                    <NotesIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-ui font-semibold text-heading m-0 truncate">{c.title}</p>
                    <span className="text-badge text-muted">{c.author}</span>
                  </div>
                </div>
                <span className="text-badge text-muted shrink-0 ml-3">{c.when}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popularne tematy */}
        <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-h3 font-bold text-heading m-0">Popularne tematy</p>
            <button className="text-badge font-bold text-primary-nav hover:underline cursor-pointer">
              Eksploruj
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {trendingSubjects.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 py-2 cursor-pointer group">
                <span className="text-badge font-bold text-muted w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ui font-medium text-heading group-hover:text-primary-nav transition-colors truncate">
                      {s.name}
                    </span>
                    <span className="text-badge text-muted shrink-0 ml-2">{s.count} notatek</span>
                  </div>
                  <div className="h-1 bg-surface-2 rounded-pill overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-pill"
                      style={{ width: `${(s.count / trendingSubjects[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
