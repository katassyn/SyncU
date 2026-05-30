import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import type { ScheduleData } from "@syncu/types";

const TEST_DB_PATH = `/tmp/syncu-test-schedule-changes-endpoint-${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { saveSchedule } = await import("../db/index");
const { scheduleRoutes } = await import("../handlers/schedule/index");
const { sqlite } = await import("../db/client");

const normalize = (s: string) => s.toLowerCase().trim();

const app = scheduleRoutes;

function get(path: string) {
  return app.handle(new Request(`http://localhost${path}`));
}

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
      ],
    },
  ],
  lecturers: [{ abbr: "AB", name: "Adam Baran", email: "ab@example.com" }],
};

const changedData: ScheduleData = {
  sourceUrl: "https://example.com/schedule-v2.xls",
  sections: [
    {
      id: "INF-1-S1-G1",
      label: "Informatyka G1",
      yearSemLabel: "Rok 1 Sem 1",
      groupId: "INF-1-S1",
      entries: [
        { time: "08:00-09:30", date: "2026-04-25", subject: "Matematyka Dyskretna (AB)" },
      ],
    },
  ],
  lecturers: [{ abbr: "AB", name: "Adam Baran", email: "ab@example.com" }],
};

describe("GET /schedule/changes", () => {
  test("returns count and changes array for groupId", async () => {
    sqlite.run("DELETE FROM schedule_changes");
    sqlite.run("DELETE FROM entries");
    sqlite.run("DELETE FROM sections");
    sqlite.run("DELETE FROM lecturers");
    sqlite.run("DELETE FROM schedule_meta");

    saveSchedule(baselineData, "baseline.xls", normalize);
    saveSchedule(changedData, "changed.xls", normalize);

    const res = await get("/schedule/changes?groupId=INF-1-S1");
    expect(res.status).toBe(200);

    const body = await res.json() as { count: number; changes: unknown[] };
    expect(body.count).toBeGreaterThan(0);
    expect(body.changes).toHaveLength(body.count);
    expect(Array.isArray(body.changes)).toBe(true);

    const change = body.changes[0] as {
      id: number;
      scheduleId: string;
      changeType: string;
      changedAt: string;
      prevDataJson: string | null;
    };
    expect(typeof change.id).toBe("number");
    expect(typeof change.scheduleId).toBe("string");
    expect(["added", "removed", "modified"]).toContain(change.changeType);
    expect(typeof change.changedAt).toBe("string");
  });

  test("returns empty when no changes for groupId", async () => {
    const res = await get("/schedule/changes?groupId=NONEXISTENT-GROUP");
    expect(res.status).toBe(200);

    const body = await res.json() as { count: number; changes: unknown[] };
    expect(body.count).toBe(0);
    expect(body.changes).toHaveLength(0);
  });
});
