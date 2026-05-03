import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-week-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { timetableRoutes } = await import("../handlers/timetable/index");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(timetableRoutes);

async function confirmImport(body: unknown) {
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

async function getWeek(date: string) {
	return app.handle(new Request(`http://localhost/timetable/week?date=${date}`));
}

const activePayload = {
	user: {
		email: "week@example.com",
		displayName: "Week User",
		university: "PK",
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
		filename: "active.xlsx",
		url: null,
	},
	section: {
		id: "31_1",
		label: "ROK II sem 4 - Grupa 31_1",
		yearSemLabel: "ROK II sem 4",
		groupId: 31,
		entries: [
			{
				date: "2026-05-04",
				time: "08:00-09:30",
				subject: "Algorytmy",
			},
			{
				date: "2026-05-06",
				time: "10.00-11.30",
				subject: "Bazy Danych",
			},
		],
	},
};

const inactivePayload = {
	...activePayload,
	user: {
		...activePayload.user,
		email: "inactive@example.com",
	},
	semester: {
		...activePayload.semester,
		name: "Semestr 2",
		isActive: false,
	},
	source: {
		kind: "xlsx",
		filename: "inactive.xlsx",
		url: null,
	},
	section: {
		...activePayload.section,
		entries: [
			{
				date: "2026-05-05",
				time: "12:00-13:30",
				subject: "Fizyka",
			},
		],
	},
};

describe("GET /timetable/week", () => {
	test("returns active semester sessions for the requested week with parity", async () => {
		const [activeResponse, inactiveResponse] = await Promise.all([
			confirmImport(activePayload),
			confirmImport(inactivePayload),
		]);

		expect(activeResponse.status).toBe(201);
		expect(inactiveResponse.status).toBe(201);

		const response = await getWeek("2026-05-06");
		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			weekStart: string;
			weekEnd: string;
			weekParity: "even" | "odd";
			courses: Array<{ name: string }>;
			sessions: Array<{ title: string; startsAt: string }>;
		};

		expect(body.weekStart).toBe("2026-05-04");
		expect(body.weekEnd).toBe("2026-05-10");
		expect(body.weekParity).toBe("odd");
		expect(body.courses).toHaveLength(2);
		expect(body.sessions).toHaveLength(2);
		expect(body.sessions.map((session) => session.title)).toEqual([
			"Algorytmy",
			"Bazy Danych",
		]);
	});

	test("returns 400 for invalid date query", async () => {
		const response = await getWeek("06-05-2026");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: 'Invalid date query parameter: "06-05-2026"',
		});
	});
});
