const DEFAULT_SQLITE_PATH = "./data/schedule.db";
const FILE_PREFIX = "file:";

function trimFilePrefix(value: string): string {
	return value.startsWith(FILE_PREFIX) ? value.slice(FILE_PREFIX.length) : value;
}

export function getSqliteDatabaseUrl(): string {
	const configured = process.env.DATABASE_URL ?? process.env.DB_PATH ?? DEFAULT_SQLITE_PATH;
	return configured.startsWith(FILE_PREFIX) ? configured : `${FILE_PREFIX}${configured}`;
}

export function getSqliteDatabasePath(): string {
	return trimFilePrefix(getSqliteDatabaseUrl());
}
