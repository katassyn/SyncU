/**
 * Utilsy do operowania na tygodniach kalendarzowych.
 * Tydzien u nas zaczyna sie od poniedzialku.
 */

/** Zwraca poczatek tygodnia (poniedzialek 00:00) dla podanej daty. */
export function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay() // 0 = niedz, 1 = pon, ..., 6 = sob
  const diff = day === 0 ? -6 : 1 - day // niedziela -> -6, pon -> 0, wt -> -1, etc.
  date.setDate(date.getDate() + diff)
  return date
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Format dnia w formacie zgodnym z `ScheduleEntry.date` (np. "17.03"). */
export function formatDDMM(d: Date): string {
  const day = d.getDate()
  const month = d.getMonth() + 1
  return `${day}.${month < 10 ? '0' + month : month}`
}

/** Pretty label, np. "17 - 23 marca 2026". */
export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'wrzesnia', 'pazdziernika', 'listopada', 'grudnia',
  ]
  const sameMonth = weekStart.getMonth() === end.getMonth()
  if (sameMonth) {
    return `${weekStart.getDate()} - ${end.getDate()} ${months[weekStart.getMonth()]} ${end.getFullYear()}`
  }
  return `${weekStart.getDate()} ${months[weekStart.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
}

/** Zwraca numer tygodnia ISO (1–53) dla podanej daty. */
export function isoWeekNumber(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const yearStart = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7)
}

/** Zwraca parzystość tygodnia na podstawie numeru ISO. */
export function weekParity(weekStart: Date): 'even' | 'odd' {
  return isoWeekNumber(weekStart) % 2 === 0 ? 'even' : 'odd'
}

export const DAY_NAMES = [
  'Poniedzialek',
  'Wtorek',
  'Sroda',
  'Czwartek',
  'Piatek',
  'Sobota',
  'Niedziela',
] as const

export const DAY_NAMES_SHORT = ['Pn', 'Wt', 'Sr', 'Cz', 'Pt', 'So', 'Nd'] as const
