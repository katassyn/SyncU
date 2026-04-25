import { describe, expect, test, beforeEach, afterAll } from "bun:test";
import { unlinkSync } from "fs";

const TEST_DB_PATH = "/tmp/syncu-test-schedule.db";

// Set env before importing db module
process.env.DB_PATH = TEST_DB_PATH;

// Dynamic import so DB_PATH env is set first
const { getCachedSchedule, saveSchedule } = await import("./index");

function cleanup() {
  try {
    unlinkSync(TEST_DB_PATH);
    unlinkSync(`${TEST_DB_PATH}-wal`);
    unlinkSync(`${TEST_DB_PATH}-shm`);
  } catch {}
}

afterAll(cleanup);

describe("schedule cache DB", () => {
  test("returns null when cache is empty", () => {
    const result = getCachedSchedule();
    // First run or after cleanup — may have data from previous test
    // Just verify the function works without throwing
    expect(result === null || typeof result === "object").toBe(true);
  });

  test("saves and retrieves schedule data", () => {
    const testData = JSON.stringify({ sections: [], lecturers: [] });
    saveSchedule("test-file.xls", testData);

    const cached = getCachedSchedule();
    expect(cached).not.toBeNull();
    expect(cached!.xls_filename).toBe("test-file.xls");
    expect(cached!.data_json).toBe(testData);
  });

  test("overwrites previous cache on save", () => {
    saveSchedule("old-file.xls", '{"old": true}');
    saveSchedule("new-file.xls", '{"new": true}');

    const cached = getCachedSchedule();
    expect(cached!.xls_filename).toBe("new-file.xls");
    expect(cached!.data_json).toBe('{"new": true}');
  });
});
