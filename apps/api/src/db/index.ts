import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DB_PATH ?? "data/schedule.db";

let db: Database;

function getDb(): Database {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH, { create: true });
    db.run("PRAGMA journal_mode = WAL");
    db.run(`
      CREATE TABLE IF NOT EXISTS schedule_cache (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        xls_filename TEXT NOT NULL,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export function getCachedSchedule(): { xls_filename: string; data_json: string } | null {
  const row = getDb()
    .query("SELECT xls_filename, data_json FROM schedule_cache WHERE id = 1")
    .get();
  return row as { xls_filename: string; data_json: string } | null;
}

export function saveSchedule(filename: string, dataJson: string): void {
  getDb().run(
    "INSERT OR REPLACE INTO schedule_cache (id, xls_filename, data_json, updated_at) VALUES (1, ?, ?, datetime('now'))",
    [filename, dataJson]
  );
}
