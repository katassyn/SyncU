import * as XLSX from 'xlsx'
import type {
  LecturerInfo,
  ParsedTimetable,
  ScheduleEntry,
  ScheduleSection,
} from './types'

/**
 * Parser planu z Politechniki Krakowskiej.
 *
 * Format zrodlowy:
 * - jeden xlsx zawiera plan WSZYSTKICH grup (sekcji)
 * - sa merged cells, ktore trzeba wczesniej "rozprasowac" (fillMerges)
 * - sekcje wykrywane heurystycznie po wierszu "ROK X sem Y" + wierszu
 *   z numerami grup (11, 12, 21, 22, 31, 32, 41, 42)
 * - daty w arkuszu sa Excel serial numbers (>40000), trzeba je przeliczyc
 * - na koncu jest legenda z prowadzacymi
 *
 * Logika oryginalnie napisana w `Sniezka1927/plan-pk` -> `src/lib/xls-parser.ts`,
 * tutaj przepisana jako pure function bez logow + zwracajaca jeden obiekt
 * `ParsedTimetable`.
 */

// Numery grup ktore parser potrafi rozpoznac w wierszu naglowka.
const KNOWN_GROUPS = new Set([11, 12, 21, 22, 31, 32, 41, 42])
const YEAR_SEM_PATTERN = /ROK\s+[IVX]+\s+sem\s+\d+/i
const TIME_SLOT_PATTERN = /\d[.:]\d{2}\s*-\s*\d/
const EXCEL_DATE_THRESHOLD = 40000

type Cell = string | number | boolean | null | undefined
type Grid = Cell[][]

type SectionConfig = {
  id: string
  label: string
  yearSemLabel: string
  groupId: number
  columns: number[]
}

/** Zamienia Excel serial number na JS Date. */
export function excelDateToJSDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400
  const dateInfo = new Date(utcValue * 1000)
  return new Date(
    dateInfo.getFullYear(),
    dateInfo.getMonth(),
    dateInfo.getDate(),
  )
}

/** Wypelnia kazda komorke w merge range wartoscia z lewej-gornej. */
export function fillMerges(data: Grid, merges: XLSX.Range[] | undefined): void {
  if (!merges) return
  for (const merge of merges) {
    const val = data[merge.s.r]?.[merge.s.c]
    if (val === undefined) continue
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      if (!data[r]) data[r] = []
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        data[r][c] = val
      }
    }
  }
}

/** Wykrywa sekcje (grupy) na podstawie pierwszych ~15 wierszy. */
export function discoverSections(data: Grid): SectionConfig[] {
  const headerRows = data.slice(0, 15)

  // 1) Wiersz "ROK X sem Y"
  let yearSemRow = -1
  for (let r = 0; r < headerRows.length; r++) {
    const row = headerRows[r]
    if (!row) continue
    for (const cell of row) {
      if (typeof cell === 'string' && YEAR_SEM_PATTERN.test(cell)) {
        yearSemRow = r
        break
      }
    }
    if (yearSemRow >= 0) break
  }

  // 2) Wiersz z numerami grup
  let groupRow = -1
  for (let r = 0; r < headerRows.length; r++) {
    const row = headerRows[r]
    if (!row) continue
    let groupCount = 0
    for (const cell of row) {
      if (typeof cell === 'number' && KNOWN_GROUPS.has(cell)) groupCount++
    }
    if (groupCount >= 2) {
      groupRow = r
      break
    }
  }

  if (groupRow < 0) return []

  // 3) Mapowanie groupId -> [kolumny]
  const groupColumnsMap = new Map<number, number[]>()
  const row = headerRows[groupRow]
  if (!row) return []
  for (let c = 0; c < row.length; c++) {
    const cell = row[c]
    if (typeof cell === 'number' && KNOWN_GROUPS.has(cell)) {
      const list = groupColumnsMap.get(cell) ?? []
      list.push(c)
      groupColumnsMap.set(cell, list)
    }
  }

  // 4) Budowa SectionConfig - jedna podgrupa = jedna kolumna
  const sections: SectionConfig[] = []
  const sortedGroups = [...groupColumnsMap.entries()].sort(
    (a, b) => a[1][0] - b[1][0],
  )
  for (const [groupId, columns] of sortedGroups) {
    const firstCol = columns[0]

    let yearSemLabel = ''
    if (yearSemRow >= 0 && headerRows[yearSemRow]) {
      for (let c = firstCol; c >= 0; c--) {
        const cell = headerRows[yearSemRow][c]
        if (typeof cell === 'string' && YEAR_SEM_PATTERN.test(cell)) {
          yearSemLabel = cell.trim()
          break
        }
      }
    }

    for (let s = 0; s < columns.length; s++) {
      const subId = `${groupId}_${s + 1}`
      sections.push({
        id: subId,
        label: yearSemLabel
          ? `${yearSemLabel} - Grupa ${subId}`
          : `Grupa ${subId}`,
        yearSemLabel,
        groupId,
        columns: [columns[s]],
      })
    }
  }

  return sections
}

/** Wyciaga wpisy planu dla jednej sekcji. */
export function extractEntries(
  data: Grid,
  section: SectionConfig,
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = []
  const seen = new Set<string>()
  let currentDate = ''

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    // Wiersz z dniem tygodnia (sobota/niedziela) - data jest w nastepnych wierszach
    if (row[1] === 'sobota' || row[1] === 'niedziela') {
      for (let j = i + 1; j < data.length; j++) {
        const nextRow = data[j]
        if (!nextRow) continue
        const first = nextRow[0]
        if (typeof first === 'number' && first > EXCEL_DATE_THRESHOLD) {
          const d = excelDateToJSDate(first)
          const day = d.getDate()
          const month = d.getMonth() + 1
          currentDate = `${day}.${month < 10 ? '0' + month : month}`
          break
        }
        if (nextRow[1] === 'sobota' || nextRow[1] === 'niedziela') break
      }
      continue
    }

    // Wiersz ze slotem czasowym ("8.00-10.30")
    const timeCell = row[1]
    if (typeof timeCell === 'string' && TIME_SLOT_PATTERN.test(timeCell)) {
      const time = timeCell

      // Data moze byc tez w pierwszej kolumnie tego wiersza
      const first = row[0]
      if (typeof first === 'number' && first > EXCEL_DATE_THRESHOLD) {
        const d = excelDateToJSDate(first)
        const day = d.getDate()
        const month = d.getMonth() + 1
        currentDate = `${day}.${month < 10 ? '0' + month : month}`
      }

      const values = new Set<string>()
      for (const col of section.columns) {
        const cell = row[col]
        if (cell !== undefined && cell !== null && String(cell).trim()) {
          values.add(String(cell).trim())
        }
      }

      if (values.size > 0) {
        const subject = [...values].join(' | ')
        const key = `${currentDate}|${time}|${subject}`
        if (!seen.has(key)) {
          seen.add(key)
          entries.push({ time, date: currentDate || 'N/A', subject })
        }
      }
    }
  }

  return entries
}

/** Parsuje sekcje "Legenda" - prowadzacy. */
export function parseLegend(data: Grid): LecturerInfo[] {
  const lecturers: LecturerInfo[] = []

  let legendRow = -1
  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    for (const cell of row) {
      if (typeof cell === 'string' && cell.trim().toLowerCase() === 'legenda') {
        legendRow = r
        break
      }
    }
    if (legendRow >= 0) break
  }

  if (legendRow < 0) return lecturers

  // Naglowek jest w legendRow + 1, dane od legendRow + 2.
  // Layout: col 2 = abbr, col 3 = name (merge 3-11), col 12 = email (merge 12-15).
  for (let r = legendRow + 2; r < data.length; r++) {
    const row = data[r]
    if (!row) continue

    const abbrCell = row[2]
    const abbr = typeof abbrCell === 'string' ? abbrCell.trim() : ''

    if (!abbr) {
      // Dwa puste wiersze pod rzad = koniec legendy.
      const next = data[r + 1]
      const nextAbbr = typeof next?.[2] === 'string' ? (next[2] as string).trim() : ''
      if (!nextAbbr) break
      continue
    }

    const nameCell = row[3]
    const emailCell = row[12]
    lecturers.push({
      abbr,
      name: typeof nameCell === 'string' ? nameCell.trim() : '',
      email: typeof emailCell === 'string' ? emailCell.trim() : '',
    })
  }

  const seen = new Set<string>()
  return lecturers.filter((l) => {
    const key = `${l.abbr}\0${l.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Glowna funkcja eksportowana dla aplikacji.
 * Bierze surowy ArrayBuffer/Uint8Array (z FileReadera w przegladarce
 * albo z `Bun.file().arrayBuffer()` na backendzie) i zwraca sparsowany plan.
 *
 * @throws Error gdy nie znaleziono zadnej sekcji w pliku
 */
export function importTimetable(
  buffer: ArrayBuffer | Uint8Array,
): ParsedTimetable {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const workbook = XLSX.read(view, { type: 'array' })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Plik xlsx nie zawiera zadnego arkusza')
  }
  const worksheet = workbook.Sheets[sheetName]
  const data: Grid = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: undefined,
  }) as Grid

  fillMerges(data, worksheet['!merges'])

  const sectionConfigs = discoverSections(data)
  if (sectionConfigs.length === 0) {
    throw new Error(
      'Nie udalo sie wykryc grup w pliku - sprawdz, czy to plan z PK',
    )
  }

  const lecturers = parseLegend(data)
  const sections: ScheduleSection[] = sectionConfigs.map((s) => ({
    id: s.id,
    label: s.label,
    yearSemLabel: s.yearSemLabel,
    groupId: s.groupId,
    entries: extractEntries(data, s),
  }))

  return { sections, lecturers }
}
