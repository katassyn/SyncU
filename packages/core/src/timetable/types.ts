/**
 * Typy dla parsera planu z Excela (format Politechniki Krakowskiej).
 * Pojedynczy plik xlsx zawiera plan wszystkich grup, parser zwraca liste sekcji
 * (jedna sekcja = jedna konkretna podgrupa, np. "Grupa 32_1").
 */

export type ScheduleEntry = {
  /** "8.00-10.30" */
  time: string
  /** "17.03" (dzien.miesiac) */
  date: string
  /** Surowy tekst z komorki - moze zawierac kilka wartosci polaczone " | " */
  subject: string
}

export type ScheduleSection = {
  /** "32_1" - groupId + index podgrupy */
  id: string
  /** "ROK III sem 6 - Grupa 32_1" */
  label: string
  /** "ROK III sem 6" */
  yearSemLabel: string
  /** Numer grupy z wiersza naglowka (np. 32) */
  groupId: number
  /** Wpisy w terminarzu dla tej sekcji */
  entries: ScheduleEntry[]
}

export type LecturerInfo = {
  /** "OB" */
  abbr: string
  /** "dr Olaf Bar" */
  name: string
  /** "olaf.bar@pk.edu.pl" */
  email: string
}

export type ParsedTimetable = {
  sections: ScheduleSection[]
  lecturers: LecturerInfo[]
}
