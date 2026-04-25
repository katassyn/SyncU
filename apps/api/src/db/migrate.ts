import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, migrationsFolder } from "./client";

migrate(db, {
	migrationsFolder,
});

console.log("Drizzle migrations applied successfully.");
