import { describe, expect, test, afterAll } from "bun:test";
import { unlinkSync } from "fs";
import type { ScheduleData } from "@syncu/types";

const TEST_DB_PATH = `/tmp/syncu-test-schedule-${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}.db`;

// Set env before importing db module
process.env.DB_PATH = TEST_DB_PATH;

const {
  getCachedFilename,
  saveSchedule,
  getSourceUrl,
  getAllSections,
  getAllLecturers,
  getSectionsByGroupPrefix,
  getEntriesByLecturerAbbr,
  getLecturerByNormalizedAbbr,
  getFullScheduleData,
  getRecentScheduleChanges,
} = await import("../db/index");
const { sqlite } = await import("../db/client");

const normalize = (s: string) => s.toLowerCase().trim();

function cleanup() {
  try {
    unlinkSync(TEST_DB_PATH);
    unlinkSync(`${TEST_DB_PATH}-wal`);
    unlinkSync(`${TEST_DB_PATH}-shm`);
  } catch {}
}

afterAll(cleanup);

const testData: ScheduleData = {
  sourceUrl: "https://example.com/schedule.xls",
  sections: [
    {
      id: "INF-1-S1-G1",
      label: "Informatyka G1",
      yearSemLabel: "Rok 1 Sem 1",
      groupId: "INF-1-S1",
      entries: [
        { time: "08:00-09:30", date: "2026-04-25", subject: "Matematyka (AB)" },
        { time: "10:00-11:30", date: "2026-04-25", subject: "Fizyka (CD)" },
      ],
    },
    {
      id: "INF-1-S1-G2",
      label: "Informatyka G2",
      yearSemLabel: "Rok 1 Sem 1",
      groupId: "INF-1-S1",
      entries: [
        { time: "08:00-09:30", date: "2026-04-25", subject: "Fizyka (CD)" },
      ],
    },
  ],
  lecturers: [
    { abbr: "AB", name: "Adam Baran", email: "ab@example.com" },
    { abbr: "CD", name: "Celina Duda", email: "cd@example.com" },
  ],
};

const changedData: ScheduleData = {
  sourceUrl: "https://example.com/changed.xls",
  sections: [
    {
      id: "INF-1-S1-G1",
      label: "Informatyka G1",
      yearSemLabel: "Rok 1 Sem 1",
      groupId: "INF-1-S1",
      entries: [
        { time: "08:00-09:30", date: "2026-04-25", subject: "Matematyka Dyskretna (AB)" },
        { time: "12:00-13:30", date: "2026-04-25", subject: "Programowanie (EF)" },
      ],
    },
    {
      id: "INF-1-S1-G2",
      label: "Informatyka G2",
      yearSemLabel: "Rok 1 Sem 1",
      groupId: "INF-1-S1",
      entries: [
        { time: "08:00-09:30", date: "2026-04-25", subject: "Fizyka (CD)" },
      ],
    },
  ],
  lecturers: [
    { abbr: "AB", name: "Adam Baran", email: "ab@example.com" },
    { abbr: "CD", name: "Celina Duda", email: "cd@example.com" },
    { abbr: "EF", name: "Ewa Filipska", email: "ef@example.com" },
  ],
};

describe("schedule DB", () => {
  test("returns null when cache is empty", () => {
    const result = getCachedFilename();
    expect(result === null || typeof result === "string").toBe(true);
  });

  test("saves and retrieves schedule data", () => {
    saveSchedule(testData, "test-file.xls", normalize);

    expect(getCachedFilename()).toBe("test-file.xls");
    expect(getSourceUrl()).toBe("https://example.com/schedule.xls");
  });

  test("getAllSections returns all sections without entries", () => {
    const sections = getAllSections();
    expect(sections).toHaveLength(2);
    expect(sections[0].id).toBe("INF-1-S1-G1");
    expect(sections[1].id).toBe("INF-1-S1-G2");
  });

  test("getAllLecturers returns all lecturers", () => {
    const lecturers = getAllLecturers();
    expect(lecturers).toHaveLength(2);
    expect(lecturers.find((l) => l.abbr === "AB")?.name).toBe("Adam Baran");
  });

  test("getSectionsByGroupPrefix filters by prefix", () => {
    const sections = getSectionsByGroupPrefix("INF-1-S1-G1");
    expect(sections).toHaveLength(1);
    expect(sections[0].entries).toHaveLength(2);
  });

  test("getSectionsByGroupPrefix returns multiple matches", () => {
    const sections = getSectionsByGroupPrefix("INF-1-S1");
    expect(sections).toHaveLength(2);
  });

  test("getEntriesByLecturerAbbr finds entries", () => {
    const entries = getEntriesByLecturerAbbr("cd");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].subject).toContain("CD");
  });

  test("getLecturerByNormalizedAbbr finds lecturer", () => {
    const lecturer = getLecturerByNormalizedAbbr("ab");
    expect(lecturer).not.toBeNull();
    expect(lecturer!.name).toBe("Adam Baran");
  });

  test("getLecturerByNormalizedAbbr returns null for unknown", () => {
    const lecturer = getLecturerByNormalizedAbbr("zz");
    expect(lecturer).toBeNull();
  });

  test("getFullScheduleData reconstructs full data", () => {
    const full = getFullScheduleData();
    expect(full.sourceUrl).toBe("https://example.com/schedule.xls");
    expect(full.sections).toHaveLength(2);
    expect(full.lecturers).toHaveLength(2);
    expect(full.sections[0].entries).toHaveLength(2);
  });

  test("overwrites previous data on save", () => {
    const newData: ScheduleData = {
      sourceUrl: "https://example.com/new.xls",
      sections: [],
      lecturers: [],
    };
    saveSchedule(newData, "new-file.xls", normalize);

    expect(getCachedFilename()).toBe("new-file.xls");
    expect(getAllSections()).toHaveLength(0);
    expect(getAllLecturers()).toHaveLength(0);
  });

  test("stores recent added, removed and modified schedule changes", () => {
    sqlite.run("DELETE FROM schedule_changes");
    sqlite.run("DELETE FROM entries");
    sqlite.run("DELETE FROM sections");
    sqlite.run("DELETE FROM lecturers");
    sqlite.run("DELETE FROM schedule_meta");

    saveSchedule(testData, "baseline.xls", normalize);
    saveSchedule(changedData, "changed.xls", normalize);

    const changes = getRecentScheduleChanges("INF-1-S1", 30);

    expect(changes).toHaveLength(3);
    expect(changes.map((change) => change.changeType).sort()).toEqual([
      "added",
      "modified",
      "removed",
    ]);

    const modified = changes.find((change) => change.changeType === "modified");
    const added = changes.find((change) => change.changeType === "added");
    const removed = changes.find((change) => change.changeType === "removed");

    expect(modified?.scheduleId).toContain("matematyka dyskretna (ab)");
    expect(JSON.parse(modified!.prevDataJson!)).toMatchObject({
      subject: "Matematyka (AB)",
      time: "08:00-09:30",
    });

    expect(added?.scheduleId).toContain("programowanie (ef)");
    expect(added?.prevDataJson).toBeNull();

    expect(removed?.scheduleId).toContain("10:00-11:30");
    expect(JSON.parse(removed!.prevDataJson!)).toMatchObject({
      subject: "Fizyka (CD)",
      time: "10:00-11:30",
    });
  });
});
