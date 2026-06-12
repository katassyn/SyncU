import { normalize } from '../index'

/**
 * Ekstrakcja listy przedmiotow z wpisow planu PK.
 *
 * Komorka planu wyglada np. tak:
 *   "Metody uczenia maszynowego\nwykład\ndr hab. inż. Michał Bereta ... ZDALNIE"
 *   "MUM              lab.                 OB            s. 135"
 *   "Projekt zespołowy P                  PJ                   s. 303 KMS"
 *   "BRAK ZAJĘĆ"
 *
 * Nazwa przedmiotu to tekst PRZED pierwszym znacznikiem typu zajec
 * (wykład / lab. / ćwiczenia / seminarium / samodzielne "P"/"W"/"L"/"C").
 * Wyklady uzywaja pelnych nazw, laby skrotow bedacych inicjalami slow
 * pelnej nazwy ("Programowanie interfejsów graficznych" -> "PIG"),
 * wiec skroty sa scalane z pelnymi nazwami po inicjalach.
 */

export type SubjectInfo = {
  /** Kanoniczna (najdluzsza znana) nazwa przedmiotu. */
  name: string
  /** Znormalizowane aliasy (skroty + pelna nazwa) do dopasowywania wpisow. */
  aliases: string[]
  /** Liczba wpisow planu dopasowanych do przedmiotu. */
  entryCount: number
}

const NO_CLASSES_RE = /^brak zaj/i

// Pelne slowa typow zajec (case-insensitive)
const TYPE_WORDS_RE =
  /(wykład|wyklad|laboratorium|ćwiczenia|cwiczenia|seminarium|lektorat|egzamin|zaliczenie)/i

// Skrocone formy z kropka: "lab.", "ćw.", "wyk.", "proj.", "sem."
const TYPE_DOTTED_RE = /(\b(?:lab|ćw|cw|wyk|proj|sem)\.)/i

// Samodzielna wielka litera typu zajec otoczona spacjami: "IO P MS", "Fizyka W ..."
const TYPE_SINGLE_LETTER_RE = /\s([WLPCS])(?=\s|$)/

/** Pojedyncza komorka -> nazwa przedmiotu (lub null dla "BRAK ZAJĘĆ"/pustych). */
export function extractSubjectName(rawCell: string): string | null {
  const flat = rawCell.replace(/\s+/g, ' ').trim()
  if (!flat || NO_CLASSES_RE.test(flat)) return null

  let cutAt = flat.length

  const wordMatch = TYPE_WORDS_RE.exec(flat)
  if (wordMatch && wordMatch.index > 0) cutAt = Math.min(cutAt, wordMatch.index)

  const dottedMatch = TYPE_DOTTED_RE.exec(flat)
  if (dottedMatch && dottedMatch.index > 0) cutAt = Math.min(cutAt, dottedMatch.index)

  const letterMatch = TYPE_SINGLE_LETTER_RE.exec(flat)
  if (letterMatch && letterMatch.index > 0) cutAt = Math.min(cutAt, letterMatch.index)

  const name = flat.slice(0, cutAt).trim().replace(/[,;|-]+$/, '').trim()
  return name.length >= 2 ? name : null
}

/** Inicjaly slow nazwy: "Wstęp do projektowanie aplikacji internetowych" -> "wdpai". */
function wordInitials(name: string): string {
  return normalize(name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join('')
}

function isAbbreviation(name: string): boolean {
  return !name.includes(' ') && name.length <= 8
}

/**
 * Lista przedmiotow z wpisow planu: czysci komorki, scala skroty z pelnymi
 * nazwami (po inicjalach slow), zlicza wpisy. Posortowana alfabetycznie.
 */
export function extractSubjects(entries: Array<{ subject: string }>): SubjectInfo[] {
  // Komorka moze zawierac kilka wartosci polaczonych " | " (merge z parsera)
  const names: string[] = []
  for (const entry of entries) {
    for (const part of entry.subject.split(' | ')) {
      const name = extractSubjectName(part)
      if (name) names.push(name)
    }
  }

  // Najpierw pelne nazwy (>= 2 slowa) jako kanoniczne
  const byNormalized = new Map<string, { name: string; count: number }>()
  for (const name of names) {
    const key = normalize(name)
    const existing = byNormalized.get(key)
    if (existing) {
      existing.count += 1
      // Preferuj dluzszy zapis tej samej nazwy (np. wieksza kompletnosc)
      if (name.length > existing.name.length) existing.name = name
    } else {
      byNormalized.set(key, { name, count: 1 })
    }
  }

  const fullNames = [...byNormalized.entries()].filter(([, v]) => v.name.includes(' '))
  const initialsToFullKey = new Map<string, string>()
  for (const [key, value] of fullNames) {
    initialsToFullKey.set(wordInitials(value.name), key)
  }

  // Skroty doklej do pelnych nazw po inicjalach
  const subjects = new Map<string, SubjectInfo>()
  for (const [key, value] of byNormalized.entries()) {
    if (isAbbreviation(value.name)) {
      const fullKey = initialsToFullKey.get(normalize(value.name))
      if (fullKey && fullKey !== key) {
        const full = byNormalized.get(fullKey)!
        const existing = subjects.get(fullKey)
        if (existing) {
          existing.aliases.push(key)
          existing.entryCount += value.count
        } else {
          subjects.set(fullKey, {
            name: full.name,
            aliases: [fullKey, key],
            entryCount: full.count + value.count,
          })
        }
        continue
      }
    }
    const existing = subjects.get(key)
    if (existing) {
      existing.entryCount += value.count
    } else {
      subjects.set(key, { name: value.name, aliases: [key], entryCount: value.count })
    }
  }

  return [...subjects.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

/** Czy surowa komorka planu nalezy do danego przedmiotu (po aliasach). */
export function entryMatchesSubject(subject: SubjectInfo, rawCell: string): boolean {
  for (const part of rawCell.split(' | ')) {
    const name = extractSubjectName(part)
    if (name && subject.aliases.includes(normalize(name))) return true
  }
  return false
}
