import type {
  ScheduleData,
  ScheduleEntry,
  SectionSchedule,
  LecturerInfo,
} from "@syncu/types";
import { sqlite } from "./client";
import { detectScheduleChanges } from "./schedule-changes";

function getDb() {
  return sqlite;
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
  const previousData = getCachedFilename() ? getFullScheduleData() : null;
  const changes = detectScheduleChanges(previousData, data, normalizeFn);
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
      "INSERT OR IGNORE INTO lecturers (abbr, abbr_normalized, name, email) VALUES (?, ?, ?, ?)"
    );
    for (const lect of data.lecturers) {
      insertLecturer.run(
        lect.abbr,
        normalizeFn(lect.abbr),
        lect.name,
        lect.email
      );
    }

    if (changes.length > 0) {
      const insertChange = d.prepare(
        "INSERT INTO schedule_changes (schedule_id, change_type, changed_at, prev_data_json) VALUES (?, ?, ?, ?)"
      );
      const changedAt = new Date().toISOString();
      for (const change of changes) {
        insertChange.run(
          change.scheduleId,
          change.changeType,
          changedAt,
          change.prevDataJson
        );
      }
    }
  });
  tx();
}

export type ScheduleChangeRecord = {
  id: number;
  scheduleId: string;
  changeType: "added" | "removed" | "modified";
  changedAt: string;
  prevDataJson: string | null;
};

export function getRecentScheduleChanges(
  groupIdPrefix: string,
  days = 7
): ScheduleChangeRecord[] {
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return getDb()
    .query(
      `SELECT id,
              schedule_id AS scheduleId,
              change_type AS changeType,
              changed_at AS changedAt,
              prev_data_json AS prevDataJson
       FROM schedule_changes
       WHERE schedule_id LIKE ? || '%'
         AND changed_at >= ?
       ORDER BY changed_at DESC, id DESC`
    )
    .all(groupIdPrefix, threshold) as ScheduleChangeRecord[];
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

export function cleanupOldScheduleChanges(olderThanDays = 30): number {
  const threshold = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const result = getDb().run(
    "DELETE FROM schedule_changes WHERE changed_at < ?",
    [threshold]
  );
  return result.changes;
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
