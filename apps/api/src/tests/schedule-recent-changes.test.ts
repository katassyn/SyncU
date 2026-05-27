import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import type { ScheduleData } from "@syncu/types";

const TEST_DB_PATH = `/tmp/syncu-test-schedule-recent-changes-${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { saveSchedule } = await import("../db/index");
const { sqlite } = await import("../db/client");
const { buildGroupScheduleResponse } = await import("../handlers/schedule/index");

const normalize = (s: string) => s.toLowerCase().trim();

function cleanup() {
  try {
    unlinkSync(TEST_DB_PATH);
    unlinkSync(`${TEST_DB_PATH}-wal`);
    unlinkSync(`${TEST_DB_PATH}-shm`);
  } catch {}
}

afterAll(cleanup);

const baselineData: ScheduleData = {
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
  ],
  lecturers: [
    { abbr: "AB", name: "Adam Baran", email: "ab@example.com" },
    { abbr: "CD", name: "Celina Duda", email: "cd@example.com" },
    { abbr: "EF", name: "Ewa Filipska", email: "ef@example.com" },
  ],
};

const changedData: ScheduleData = {
  sourceUrl: "https://example.com/schedule-new.xls",
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
  ],
  lecturers: [
    { abbr: "AB", name: "Adam Baran", email: "ab@example.com" },
    { abbr: "CD", name: "Celina Duda", email: "cd@example.com" },
    { abbr: "EF", name: "Ewa Filipska", email: "ef@example.com" },
  ],
};

describe("schedule group response recentChanges", () => {
  test("returns recentChanges with current and previous entry data", () => {
    sqlite.run("DELETE FROM schedule_changes");
    sqlite.run("DELETE FROM entries");
    sqlite.run("DELETE FROM sections");
    sqlite.run("DELETE FROM lecturers");
    sqlite.run("DELETE FROM schedule_meta");

    saveSchedule(baselineData, "baseline.xls", normalize);
    saveSchedule(changedData, "changed.xls", normalize);

    const response = buildGroupScheduleResponse("INF-1-S1");

    expect(response.sections).toHaveLength(1);
    expect(response.recentChanges).toHaveLength(3);

    const modified = response.recentChanges.find((change) => change.changeType === "modified");
    const added = response.recentChanges.find((change) => change.changeType === "added");
    const removed = response.recentChanges.find((change) => change.changeType === "removed");

    expect(modified?.prevData).toMatchObject({
      subject: "Matematyka (AB)",
      time: "08:00-09:30",
    });
    expect(modified?.currentData).toMatchObject({
      subject: "Matematyka Dyskretna (AB)",
      time: "08:00-09:30",
    });

    expect(added?.prevData).toBeNull();
    expect(added?.currentData).toMatchObject({
      subject: "Programowanie (EF)",
      time: "12:00-13:30",
    });

    expect(removed?.prevData).toMatchObject({
      subject: "Fizyka (CD)",
      time: "10:00-11:30",
    });
    expect(removed?.currentData).toBeNull();
  });
});
