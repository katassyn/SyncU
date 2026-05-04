import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { getSqliteDatabasePath } from "./config";
import * as schema from "./schema";

const sqlitePath = getSqliteDatabasePath();

mkdirSync(dirname(sqlitePath), { recursive: true });

export const sqlite = new Database(sqlitePath, { create: true });
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export const migrationsFolder = join(import.meta.dir, "migrations");

try {
	migrate(db, { migrationsFolder });
} catch (err: any) {
	const msg = err?.message ?? "";
	const causeMsg = err?.cause?.message ?? "";
	if (!msg.includes("already exists") && !causeMsg.includes("already exists"))
		throw err;
}

export type DbClient = typeof db;
