import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";

const TEST_DB_PATH = `/tmp/syncu-test-schedule-cleanup-${Date.now()}-${Math.random()
  .toString(16)
  .slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { cleanupOldScheduleChanges } = await import("../db/index");
const { sqlite } = await import("../db/client");

function cleanup() {
  try {
    unlinkSync(TEST_DB_PATH);
    unlinkSync(`${TEST_DB_PATH}-wal`);
    unlinkSync(`${TEST_DB_PATH}-shm`);
  } catch {}
}

afterAll(cleanup);

describe("cleanupOldScheduleChanges", () => {
  test("deletes records older than threshold, keeps recent ones", () => {
    sqlite.run("DELETE FROM schedule_changes");

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'added', ?)",
      ["old-1", thirtyOneDaysAgo]
    );
    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'removed', ?)",
      ["old-2", thirtyFiveDaysAgo]
    );
    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'modified', ?)",
      ["recent-1", fiveDaysAgo]
    );
    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'added', ?)",
      ["recent-2", now]
    );

    const deleted = cleanupOldScheduleChanges(30);

    expect(deleted).toBe(2);

    const remaining = sqlite
      .query("SELECT schedule_id FROM schedule_changes ORDER BY schedule_id")
      .all() as { schedule_id: string }[];

    expect(remaining).toHaveLength(2);
    expect(remaining.map((r) => r.schedule_id)).toEqual(["recent-1", "recent-2"]);
  });

  test("returns 0 when no records exceed threshold", () => {
    sqlite.run("DELETE FROM schedule_changes");

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'added', ?)",
      ["recent", fiveDaysAgo]
    );

    const deleted = cleanupOldScheduleChanges(30);
    expect(deleted).toBe(0);
  });

  test("deletes all records when all are older than threshold", () => {
    sqlite.run("DELETE FROM schedule_changes");

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    sqlite.run(
      "INSERT INTO schedule_changes (schedule_id, change_type, changed_at) VALUES (?, 'added', ?)",
      ["x", sixtyDaysAgo]
    );

    const deleted = cleanupOldScheduleChanges(30);
    expect(deleted).toBe(1);

    const remaining = sqlite
      .query("SELECT COUNT(*) as cnt FROM schedule_changes")
      .get() as { cnt: number };
    expect(remaining.cnt).toBe(0);
  });
});
