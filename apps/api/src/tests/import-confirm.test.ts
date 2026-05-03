import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-import-confirm-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { timetableRoutes } = await import("../handlers/timetable/index");
const { sqlite } = await import("../db/client");

function getCounts() {
	return {
		users: (sqlite.query("SELECT COUNT(*) as count FROM users").get() as { count: number }).count,
		semesters: (sqlite
			.query("SELECT COUNT(*) as count FROM semesters")
			.get() as { count: number }).count,
		imports: (sqlite
			.query("SELECT COUNT(*) as count FROM timetable_imports")
			.get() as { count: number }).count,
		courses: (sqlite.query("SELECT COUNT(*) as count FROM courses").get() as { count: number }).count,
		sessions: (sqlite
			.query("SELECT COUNT(*) as count FROM class_sessions")
			.get() as { count: number }).count,
	};
}

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(timetableRoutes);

function req(body: unknown) {
	return app.handle(
		new Request("http://localhost/timetable/import/confirm", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		}),
	);
}

const validPayload = {
	user: {
		email: "kamil@example.com",
		displayName: "Kamil Gebala",
		university: "Politechnika Krakowska",
		fieldOfStudy: "Informatyka",
		yearOfStudy: 2,
	},
	semester: {
		name: "Semestr 4",
		academicYear: "2025/2026",
		term: "summer",
		isActive: true,
	},
	source: {
		kind: "xlsx",
		filename: "plan.xlsx",
		url: null,
	},
	section: {
		id: "32_1",
		label: "ROK II sem 4 - Grupa 32_1",
		yearSemLabel: "ROK II sem 4",
		groupId: 32,
		entries: [
			{
				date: "2026-04-25",
				time: "08:00-09:30",
				subject: "Algorytmy",
			},
			{
				date: "25.04",
				time: "10.00-11.30",
				subject: "Bazy Danych",
			},
		],
	},
};

describe("POST /timetable/import/confirm", () => {
	test("saves imported records inside a transaction", async () => {
		const before = getCounts();
		const response = await req(validPayload);

		expect(response.status).toBe(201);

		const body = (await response.json()) as {
			importResult: { status: string; importedEntriesCount: number; importedSectionsCount: number };
			courseCount: number;
			classSessionCount: number;
		};

		expect(body.importResult.status).toBe("completed");
		expect(body.importResult.importedSectionsCount).toBe(1);
		expect(body.importResult.importedEntriesCount).toBe(2);
		expect(body.courseCount).toBe(2);
		expect(body.classSessionCount).toBe(2);

		const after = getCounts();

		expect(after.users - before.users).toBe(1);
		expect(after.semesters - before.semesters).toBe(1);
		expect(after.imports - before.imports).toBe(1);
		expect(after.courses - before.courses).toBe(2);
		expect(after.sessions - before.sessions).toBe(2);
	});

	test("rolls back when one of the entries is invalid", async () => {
		const before = getCounts();
		const response = await req({
			...validPayload,
			user: {
				...validPayload.user,
				email: "rollback@example.com",
			},
			section: {
				...validPayload.section,
				entries: [
					{
						date: "bad-date",
						time: "08:00-09:30",
						subject: "Systemy Operacyjne",
					},
				],
			},
		});

		expect(response.status).toBe(400);

		const body = (await response.json()) as { message: string };
		expect(body.message).toContain("Invalid date format");

		const imports = sqlite
			.query("SELECT COUNT(*) as count FROM timetable_imports WHERE source_filename = ?")
			.get("plan.xlsx") as { count: number };
		const rollbackUser = sqlite
			.query("SELECT COUNT(*) as count FROM users WHERE email = ?")
			.get("rollback@example.com") as { count: number };
		const after = getCounts();

		expect(rollbackUser.count).toBe(0);
		expect(imports.count).toBeGreaterThanOrEqual(1);
		expect(after.users).toBe(before.users);
		expect(after.semesters).toBe(before.semesters);
		expect(after.imports).toBe(before.imports);
		expect(after.courses).toBe(before.courses);
		expect(after.sessions).toBe(before.sessions);
	});
});
