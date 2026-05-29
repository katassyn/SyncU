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

/** Format ISO YYYY-MM-DD (np. "2026-05-04") - do query param przy GET /timetable/week. */
export function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${m < 10 ? '0' + m : m}-${day < 10 ? '0' + day : day}`
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

/* --- miesiac (G-10) --- */

/** Pierwszy dzien miesiaca dla podanej daty (1. dnia, 00:00). */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Przesuwa o n miesiecy (zwraca 1. dzien docelowego miesiaca). */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/**
 * Zwraca daty do wyswietlenia w gridzie miesiaca - caly miesiac + dopelnienie
 * dniami sasiednich miesiecy, zeby grid zaczynal sie od poniedzialku i konczyl
 * na niedzieli. Zwraca 35 lub 42 daty (5 lub 6 tygodni, zaleznie od ukladu).
 */
export function monthGridDates(d: Date): Date[] {
  const first = startOfMonth(d)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0) // ostatni dzien miesiaca
  const gridStart = startOfWeek(first)
  const gridEndWeekStart = startOfWeek(last)
  const totalDays =
    Math.round((gridEndWeekStart.getTime() - gridStart.getTime()) / 86_400_000) + 7
  return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i))
}

/**
 * G-12: relatywny opis daty - "dzis" / "jutro" / "za 3 dni" / "za 2 tyg." /
 * "wczoraj" / "5 dni temu". Uzywany w countdownie kolokwiow na Today.
 */
export function formatRelativeDay(target: Date, now: Date = new Date()): string {
  const t0 = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((t0.getTime() - n0.getTime()) / 86_400_000)

  if (diff < 0) {
    const ago = Math.abs(diff)
    if (ago === 1) return 'wczoraj'
    if (ago < 7) return `${ago} dni temu`
    return `${Math.round(ago / 7)} tyg. temu`
  }
  if (diff === 0) return 'dzis'
  if (diff === 1) return 'jutro'
  if (diff < 7) return `za ${diff} dni`
  if (diff < 14) return 'za tydzien'
  if (diff < 31) return `za ${Math.round(diff / 7)} tyg.`
  return `za ${Math.round(diff / 30)} mies.`
}

/** Liczba dni do podanej daty (ujemne = w przeszlosci). */
export function daysUntil(target: Date, now: Date = new Date()): number {
  const t0 = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((t0.getTime() - n0.getTime()) / 86_400_000)
}

/** Pretty label miesiaca, np. "Maj 2026". */
export function formatMonthLabel(d: Date): string {
  const months = [
    'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
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
