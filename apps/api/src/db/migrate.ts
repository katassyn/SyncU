import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, migrationsFolder } from "./client";

try {
	migrate(db, {
		migrationsFolder,
	});
} catch (err: any) {
	const msg = err?.message ?? "";
	const causeMsg = err?.cause?.message ?? "";
	if (!msg.includes("already exists") && !causeMsg.includes("already exists")) {
		throw err;
	}
}

console.log("Drizzle migrations applied successfully.");
