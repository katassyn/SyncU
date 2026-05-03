import { defineConfig } from "drizzle-kit";
import { getSqliteDatabaseUrl } from "./src/db/config";

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./src/db/migrations",
	dialect: "sqlite",
	dbCredentials: {
		url: getSqliteDatabaseUrl(),
	},
	breakpoints: true,
	verbose: true,
	strict: true,
});
