import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { ScheduleEntry } from '@syncu/types';
import { fetchGroupSchedule } from '../lib/api';
import { addDays, formatDDMM } from '../lib/week';

// --------------- typy ---------------

type ScheduleState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'loaded'; allEntries: ScheduleEntry[] }
  | { kind: 'error' }

// --------------- placeholder data ---------------

const placeholderSessions = [
  {
    id: 'p1',
    title: 'Zaawansowana Mechanika Kwantowa',
    label: 'Wykład',
    time: '08:00–09:30',
    room: 'B-4/21',
    accent: 'border-primary',
    badge: 'bg-primary-light text-primary-nav',
  },
  {
    id: 'p2',
    title: 'Grupowe: Etyka w AI',
    label: 'Seminarium',
    time: '11:00–12:30',
    room: 'Online',
    accent: 'border-muted',
    badge: 'bg-surface-2 text-muted',
  },
  {
    id: 'p3',
    title: 'Złóż propozycję badawczą',
    label: 'Zadanie',
    time: 'Cały dzień',
    room: null,
    accent: 'border-[#c07a20]',
    badge: 'bg-[rgba(192,122,32,.1)] text-[#c07a20]',
  },
];

const deadlines = [
  { id: 1, title: 'Midterm: Rachunek III',      when: 'za 2 dni', urgent: true  },
  { id: 2, title: 'Kolokwium: Sieci Neuronowe', when: '29 paź',   urgent: false },
  { id: 3, title: 'Szkic pracy dyplomowej',     when: '4 lis',    urgent: false },
];

const studyProgress = [
  { subject: 'Fizyka',     percent: 75 },
  { subject: 'Etyka',      percent: 40 },
  { subject: 'Matematyka', percent: 90 },
];

const resources = [
  { id: 1, title: 'Kwantowe Tunelowanie — Notatki', kind: 'PDF',   author: 'Jan K.', live: false },
  { id: 2, title: 'Etyka AI — Mapa myśli',          kind: 'BOARD', author: 'Zespół', live: true  },
];

// --------------- helpers ---------------

function parseDDMM(ddmm: string): Date {
  const [d, m] = ddmm.split('.').map(Number);
  return new Date(new Date().getFullYear(), m - 1, d);
}

function dayName(date: Date): string {
  return date.toLocaleDateString('pl-PL', { weekday: 'long' });
}

function CircularProgress({ subject, percent }: { subject: string; percent: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-18">
        <svg className="size-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} className="text-surface-2" fill="none" stroke="currentColor" strokeWidth="8" />
          <circle
            cx="36" cy="36" r={r}
            className="text-primary"
            fill="none" stroke="currentColor" strokeWidth="8"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-badge font-bold text-heading">
          {percent}%
        </span>
      </div>
      <span className="text-badge text-muted">{subject}</span>
    </div>
  );
}

// --------------- sekcja "Dzisiaj" ---------------

function TodaySessionsList({ state, todayEntries }: { state: ScheduleState; todayEntries: ScheduleEntry[] }) {
  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-16 rounded-card-sm bg-surface-1 animate-pulse" />
        ))}
      </div>
    );
  }

  if (state.kind === 'loaded') {
    if (todayEntries.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-body text-muted text-center m-0">Brak zajęć na dziś.</p>
          <NavLink to="/import" className="text-badge font-bold text-primary-nav hover:underline">
            Zaimportuj plan →
          </NavLink>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {todayEntries.map((e, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-card-sm bg-surface-1 border-l-[3px] border-primary">
            <div className="flex-1 min-w-0">
              <span className="text-badge text-muted block mb-1">{e.time}</span>
              <p className="text-body font-semibold text-heading m-0 truncate">{e.subject}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {placeholderSessions.map(s => (
        <div key={s.id} className={['flex items-center gap-4 px-4 py-3 rounded-card-sm bg-surface-1 border-l-[3px]', s.accent].join(' ')}>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={['text-badge font-bold uppercase tracking-badge rounded-pill px-2 py-0.5', s.badge].join(' ')}>
                {s.label}
              </span>
              <span className="text-badge text-muted">{s.time}</span>
              {s.room && <span className="text-badge text-muted">· {s.room}</span>}
            </div>
            <p className="text-body font-semibold text-heading m-0 truncate">{s.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// --------------- sekcja "Nadchodzące zajęcia" ---------------

function UpcomingList({ state, entries }: { state: ScheduleState; entries: ScheduleEntry[] }) {
  if (state.kind === 'idle') return null;

  if (state.kind === 'loading') {
    return (
      <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4 mt-5">
        <p className="text-h3 font-bold text-heading m-0">Nadchodzące zajęcia</p>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-card-sm bg-surface-1 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.kind === 'error' || entries.length === 0) return null;

  return (
    <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-1 mt-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-h3 font-bold text-heading m-0">Nadchodzące zajęcia</p>
        <span className="text-badge text-muted">Najbliższe 7 dni</span>
      </div>

      {entries.map((e, i) => {
        const date = parseDDMM(e.date);
        return (
          <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-border-subtle last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-heading m-0 leading-snug">{e.subject}</p>
              <span className="text-badge text-muted capitalize">
                {dayName(date)} · {e.time}
              </span>
            </div>
            <span className="text-badge font-bold text-muted shrink-0 tabular-nums pt-0.5">{e.date}</span>
          </div>
        );
      })}
    </div>
  );
}

// --------------- main ---------------

export default function Today() {
  const [scheduleState, setScheduleState] = useState<ScheduleState>(() =>
    localStorage.getItem('syncu.selectedGroup') ? { kind: 'loading' } : { kind: 'idle' }
  );

  useEffect(() => {
    const groupId = localStorage.getItem('syncu.selectedGroup');
    if (!groupId) return;

    let cancelled = false;
    fetchGroupSchedule(groupId)
      .then(data => {
        if (cancelled) return;
        const allEntries = data.sections
          .flatMap(s => s.entries)
          .sort((a, b) => parseDDMM(a.date).getTime() - parseDDMM(b.date).getTime() || a.time.localeCompare(b.time));
        setScheduleState({ kind: 'loaded', allEntries });
      })
      .catch(() => {
        if (!cancelled) setScheduleState({ kind: 'error' });
      });

    return () => { cancelled = true; };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDDMM = formatDDMM(today);
  const in7days = addDays(today, 7);

  const todayEntries =
    scheduleState.kind === 'loaded'
      ? scheduleState.allEntries.filter(e => e.date === todayDDMM)
      : [];

  const upcomingEntries =
    scheduleState.kind === 'loaded'
      ? scheduleState.allEntries.filter(e => {
          const d = parseDDMM(e.date);
          return d > today && d <= in7days;
        })
      : [];

  const sessionCount =
    scheduleState.kind === 'loaded' ? todayEntries.length : 4;

  const dateLabel = today.toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="px-8 py-8">

      {/* Powitanie */}
      <div className="mb-8">
        <p className="text-display font-extrabold text-heading m-0 leading-none">
          Dzień dobry, Alex.
        </p>
        <p className="text-h3 text-muted mt-2 mb-0">
          Masz <span className="font-bold text-primary-nav">{sessionCount} zajęć</span> dzisiaj.
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Dzisiaj — 8 kolumn */}
        <div className="lg:col-span-8 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-h3 font-bold text-heading m-0">Dzisiaj</p>
            <span className="text-badge text-muted capitalize">{dateLabel}</span>
          </div>
          <TodaySessionsList state={scheduleState} todayEntries={todayEntries} />
        </div>

        {/* Terminy — 4 kolumny */}
        <div className="lg:col-span-4 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-5">
          <p className="text-h3 font-bold text-heading m-0">Terminy</p>
          <div className="flex flex-col flex-1">
            {deadlines.map((d, i) => (
              <div key={d.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className={['size-2 rounded-full shrink-0', d.urgent ? 'bg-danger' : 'bg-primary'].join(' ')} />
                  {i < deadlines.length - 1 && (
                    <div className="w-px bg-border-subtle mt-1" style={{ height: '2.5rem' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-4 last:pb-0">
                  <p className="text-body font-semibold text-heading m-0 leading-tight truncate">{d.title}</p>
                  <span className={['text-badge font-bold mt-0.5 inline-block', d.urgent ? 'text-danger' : 'text-muted'].join(' ')}>
                    {d.when}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <NavLink
            to="/week"
            className="flex items-center justify-center text-badge font-bold uppercase tracking-badge text-primary-nav bg-primary-light hover:bg-primary hover:text-on-primary rounded-pill py-2.5 transition-colors"
          >
            Pełny kalendarz
          </NavLink>
        </div>

        {/* Postęp nauki — 5 kolumn */}
        <div className="lg:col-span-5 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-6">
          <p className="text-h3 font-bold text-heading m-0">Postęp nauki</p>
          <div className="flex items-center justify-around gap-4">
            {studyProgress.map(p => (
              <CircularProgress key={p.subject} subject={p.subject} percent={p.percent} />
            ))}
          </div>
        </div>

        {/* Wspólne zasoby — 7 kolumn */}
        <div className="lg:col-span-7 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
          <p className="text-h3 font-bold text-heading m-0">Wspólne zasoby</p>
          <div className="flex flex-col gap-3">
            {resources.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 rounded-card-sm bg-surface-1 hover:bg-surface-2 transition-colors cursor-pointer">
                <div className={['size-10 rounded-card-sm flex items-center justify-center shrink-0', r.kind === 'PDF' ? 'bg-[rgba(168,56,54,.08)] text-danger' : 'bg-primary-light text-primary-nav'].join(' ')}>
                  {r.kind === 'PDF' ? <PdfIcon /> : <BoardIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-heading m-0 truncate">{r.title}</p>
                  <span className="text-badge text-muted">{r.author}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.live && (
                    <span className="flex items-center gap-1 text-badge font-bold uppercase tracking-badge bg-[rgba(168,56,54,.08)] text-danger rounded-pill px-2 py-0.5">
                      <span className="size-1.5 rounded-full bg-danger animate-pulse" />
                      Na żywo
                    </span>
                  )}
                  <span className="text-badge font-bold text-muted uppercase tracking-badge">{r.kind}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Nadchodzące zajęcia */}
      <UpcomingList state={scheduleState} entries={upcomingEntries} />

      {/* FAB */}
      <button
        aria-label="Dodaj"
        className="fixed bottom-6 right-6 size-16 rounded-pill bg-primary text-on-primary shadow-fab flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer z-50"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

// --------------- icons ---------------

function PdfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2v4h4M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7h8M6 10h5M6 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
