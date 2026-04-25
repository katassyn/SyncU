import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";
import type {
  ScheduleData,
  ScheduleEntry,
  SectionSchedule,
  LecturerInfo,
} from "@syncu/types";

const DB_PATH = process.env.DB_PATH ?? "data/schedule.db";

let db: Database;

function getDb(): Database {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH, { create: true });
    db.run("PRAGMA journal_mode = WAL");

    db.run(`
      CREATE TABLE IF NOT EXISTS schedule_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        xls_filename TEXT NOT NULL,
        source_url TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        year_sem_label TEXT NOT NULL,
        group_id TEXT NOT NULL
      )
    `);
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_sections_group_id ON sections(group_id)"
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id TEXT NOT NULL REFERENCES sections(id),
        time TEXT NOT NULL,
        date TEXT NOT NULL,
        subject TEXT NOT NULL,
        subject_normalized TEXT NOT NULL
      )
    `);
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_entries_section_id ON entries(section_id)"
    );
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_entries_subject_normalized ON entries(subject_normalized)"
    );

    db.run(`
      CREATE TABLE IF NOT EXISTS lecturers (
        abbr TEXT PRIMARY KEY,
        abbr_normalized TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_lecturers_abbr_normalized ON lecturers(abbr_normalized)"
    );
  }
  return db;
}

export function getCachedFilename(): string | null {
  const row = getDb()
    .query("SELECT xls_filename FROM schedule_meta WHERE id = 1")
    .get() as { xls_filename: string } | null;
  return row?.xls_filename ?? null;
}

export function getSourceUrl(): string {
  const row = getDb()
    .query("SELECT source_url FROM schedule_meta WHERE id = 1")
    .get() as { source_url: string } | null;
  return row?.source_url ?? "";
}

export function saveSchedule(
  data: ScheduleData,
  filename: string,
  normalizeFn: (s: string) => string
): void {
  const d = getDb();
  const tx = d.transaction(() => {
    d.run("DELETE FROM entries");
    d.run("DELETE FROM sections");
    d.run("DELETE FROM lecturers");
    d.run(
      "INSERT OR REPLACE INTO schedule_meta (id, xls_filename, source_url, updated_at) VALUES (1, ?, ?, datetime('now'))",
      [filename, data.sourceUrl]
    );

    const insertSection = d.prepare(
      "INSERT INTO sections (id, label, year_sem_label, group_id) VALUES (?, ?, ?, ?)"
    );
    const insertEntry = d.prepare(
      "INSERT INTO entries (section_id, time, date, subject, subject_normalized) VALUES (?, ?, ?, ?, ?)"
    );

    for (const section of data.sections) {
      insertSection.run(
        section.id,
        section.label,
        section.yearSemLabel,
        String(section.groupId)
      );
      for (const entry of section.entries) {
        insertEntry.run(
          section.id,
          entry.time,
          entry.date,
          entry.subject,
          normalizeFn(entry.subject)
        );
      }
    }

    const insertLecturer = d.prepare(
      "INSERT INTO lecturers (abbr, abbr_normalized, name, email) VALUES (?, ?, ?, ?)"
    );
    for (const lect of data.lecturers) {
      insertLecturer.run(
        lect.abbr,
        normalizeFn(lect.abbr),
        lect.name,
        lect.email
      );
    }
  });
  tx();
}

export function getAllSections(): Omit<SectionSchedule, "entries">[] {
  return getDb()
    .query("SELECT id, label, year_sem_label AS yearSemLabel, group_id AS groupId FROM sections")
    .all() as Omit<SectionSchedule, "entries">[];
}

export function getAllLecturers(): LecturerInfo[] {
  return getDb()
    .query("SELECT abbr, name, email FROM lecturers")
    .all() as LecturerInfo[];
}

export function getSectionsByGroupPrefix(
  groupId: string
): SectionSchedule[] {
  const d = getDb();
  const sections = d
    .query(
      "SELECT id, label, year_sem_label AS yearSemLabel, group_id AS groupId FROM sections WHERE id LIKE ? || '%'"
    )
    .all(groupId) as Omit<SectionSchedule, "entries">[];

  return sections.map((s) => ({
    ...s,
    entries: d
      .query(
        "SELECT time, date, subject FROM entries WHERE section_id = ?"
      )
      .all(s.id) as ScheduleEntry[],
  }));
}

export function getEntriesByLecturerAbbr(
  normalizedAbbr: string
): Array<{ time: string; date: string; subject: string; group: string }> {
  return getDb()
    .query(
      `SELECT e.time, e.date, e.subject, s.label AS 'group'
       FROM entries e
       JOIN sections s ON s.id = e.section_id
       WHERE e.subject_normalized LIKE '%' || ? || '%'`
    )
    .all(normalizedAbbr) as Array<{
    time: string;
    date: string;
    subject: string;
    group: string;
  }>;
}

export function getLecturerByNormalizedAbbr(
  normalizedAbbr: string
): LecturerInfo | null {
  return (
    (getDb()
      .query(
        "SELECT abbr, name, email FROM lecturers WHERE abbr_normalized = ?"
      )
      .get(normalizedAbbr) as LecturerInfo | null) ?? null
  );
}

export function getFullScheduleData(): ScheduleData {
  const d = getDb();
  const sourceUrl = getSourceUrl();
  const sections = d
    .query("SELECT id, label, year_sem_label AS yearSemLabel, group_id AS groupId FROM sections")
    .all() as Omit<SectionSchedule, "entries">[];

  return {
    sourceUrl,
    sections: sections.map((s) => ({
      ...s,
      entries: d
        .query("SELECT time, date, subject FROM entries WHERE section_id = ?")
        .all(s.id) as ScheduleEntry[],
    })),
    lecturers: getAllLecturers(),
  };
}
