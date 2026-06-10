import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-group-sharing-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-jwt-secret";

const { authRoutes } = await import("../handlers/auth/index");
const { meRoutes } = await import("../handlers/me/index");
const { coursesRoutes } = await import("../handlers/courses/index");
const { eventsRoutes } = await import("../handlers/events/index");
const { examsRoutes } = await import("../handlers/exams/index");
const { groupsRoutes } = await import("../handlers/groups/index");
const { materialsRoutes } = await import("../handlers/materials/index");
const { db } = await import("../db/client");
const { courses, semesters } = await import("../db/schema");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia()
	.use(authRoutes)
	.use(meRoutes)
	.use(coursesRoutes)
	.use(eventsRoutes)
	.use(examsRoutes)
	.use(groupsRoutes)
	.use(materialsRoutes);

function request(
	method: string,
	path: string,
	options: { body?: unknown; token?: string } = {},
) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				"content-type": "application/json",
				...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
			},
			...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
		}),
	);
}

async function registerAndLogin(email: string, displayName: string): Promise<string> {
	const registerResponse = await request("POST", "/auth/register", {
		body: { email, password: "VeryStrong123", displayName },
	});
	expect(registerResponse.status).toBe(201);

	const loginResponse = await request("POST", "/auth/login", {
		body: { email, password: "VeryStrong123" },
	});
	expect(loginResponse.status).toBe(200);
	const { token } = (await loginResponse.json()) as { token: string };
	return token;
}

const tokenA = await registerAndLogin("anna@example.com", "Anna Kowalska");
const tokenB = await registerAndLogin("bartek@example.com", "Bartek Nowak");
const tokenC = await registerAndLogin("celina@example.com", "Celina Inna");

// Anna i Bartek w grupie 32_1, Celina w innej grupie 21_2.
for (const [token, groupId] of [
	[tokenA, "32_1"],
	[tokenB, "32_1"],
	[tokenC, "21_2"],
] as const) {
	const res = await request("PATCH", "/me", { body: { groupId }, token });
	expect(res.status).toBe(200);
}

// Id Anny z /auth/me (pliki testowe wspoldziela proces, wiec id nie jest
// deterministyczne - inne testy mogly juz zarejestrowac userow).
const meResponse = await request("GET", "/auth/me", { token: tokenA });
expect(meResponse.status).toBe(200);
const { user: annaUser } = (await meResponse.json()) as { user: { id: number } };

// Seed: semestr + przedmiot dla Anny.
const now = new Date().toISOString();
const seededSemester = db
	.insert(semesters)
	.values({
		userId: annaUser.id,
		name: "Semestr letni",
		academicYear: "2025/2026",
		term: "letni",
		isActive: 1,
		createdAt: now,
		updatedAt: now,
	})
	.returning({ id: semesters.id })
	.get();

const seededCourse = db
	.insert(courses)
	.values({
		semesterId: seededSemester.id,
		name: "Fizyka",
		createdAt: now,
		updatedAt: now,
	})
	.returning({ id: courses.id })
	.get();

describe("GET /courses", () => {
	test("returns courses of the authenticated user only", async () => {
		const resA = await request("GET", "/courses", { token: tokenA });
		expect(resA.status).toBe(200);
		const bodyA = (await resA.json()) as { courses: Array<{ id: number; name: string }> };
		expect(bodyA.courses).toHaveLength(1);
		expect(bodyA.courses[0].name).toBe("Fizyka");

		const resB = await request("GET", "/courses", { token: tokenB });
		const bodyB = (await resB.json()) as { courses: unknown[] };
		expect(bodyB.courses).toHaveLength(0);
	});

	test("returns 401 without token", async () => {
		const res = await request("GET", "/courses");
		expect(res.status).toBe(401);
	});
});

describe("/events", () => {
	test("creates, lists and deletes own events", async () => {
		const createRes = await request("POST", "/events", {
			token: tokenA,
			body: {
				title: "Spotkanie projektowe",
				date: "2026-06-20",
				startTime: "10:00",
				endTime: "11:30",
				room: "A101",
			},
		});
		expect(createRes.status).toBe(201);
		const { event } = (await createRes.json()) as { event: { id: number; title: string } };
		expect(event.title).toBe("Spotkanie projektowe");

		const listRes = await request("GET", "/events", { token: tokenA });
		const listBody = (await listRes.json()) as { events: Array<{ id: number }> };
		expect(listBody.events).toHaveLength(1);

		// Bartek nie widzi i nie skasuje eventu Anny
		const listResB = await request("GET", "/events", { token: tokenB });
		const listBodyB = (await listResB.json()) as { events: unknown[] };
		expect(listBodyB.events).toHaveLength(0);

		const deleteResB = await request("DELETE", `/events/${event.id}`, { token: tokenB });
		expect(deleteResB.status).toBe(404);

		const deleteResA = await request("DELETE", `/events/${event.id}`, { token: tokenA });
		expect(deleteResA.status).toBe(200);

		const afterDelete = await request("GET", "/events", { token: tokenA });
		const afterBody = (await afterDelete.json()) as { events: unknown[] };
		expect(afterBody.events).toHaveLength(0);
	});

	test("rejects event with end before start", async () => {
		const res = await request("POST", "/events", {
			token: tokenA,
			body: {
				title: "Zly event",
				date: "2026-06-20",
				startTime: "12:00",
				endTime: "11:00",
			},
		});
		expect(res.status).toBe(400);
	});
});

describe("GET /groups/members", () => {
	test("returns members of my group only", async () => {
		const res = await request("GET", "/groups/members", { token: tokenA });
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			groupId: string;
			members: Array<{ displayName: string }>;
		};
		expect(body.groupId).toBe("32_1");
		const names = body.members.map((m) => m.displayName);
		expect(names).toContain("Anna Kowalska");
		expect(names).toContain("Bartek Nowak");
		expect(names).not.toContain("Celina Inna");
	});

	test("returns 400 when user has no group", async () => {
		const token = await registerAndLogin("nogroup@example.com", "Bez Grupy");
		const res = await request("GET", "/groups/members", { token });
		expect(res.status).toBe(400);
	});
});

describe("GET /exams?view=group", () => {
	test("group view returns exams of all group members with author name", async () => {
		const createRes = await request("POST", "/exams", {
			token: tokenA,
			body: {
				courseId: seededCourse.id,
				date: "2026-06-25T10:00:00.000Z",
				scope: "Rozdzialy 1-3",
			},
		});
		expect(createRes.status).toBe(201);

		// Bartek (ta sama grupa) widzi kolokwium Anny z jej nazwiskiem
		const groupRes = await request("GET", "/exams?view=group", { token: tokenB });
		expect(groupRes.status).toBe(200);
		const groupBody = (await groupRes.json()) as {
			exams: Array<{ courseName: string; authorName: string }>;
		};
		expect(groupBody.exams).toHaveLength(1);
		expect(groupBody.exams[0].courseName).toBe("Fizyka");
		expect(groupBody.exams[0].authorName).toBe("Anna Kowalska");

		// Domyslny widok Bartka (bez query) - pusty, bo to nie jego kolokwium
		const ownRes = await request("GET", "/exams", { token: tokenB });
		const ownBody = (await ownRes.json()) as { exams: unknown[] };
		expect(ownBody.exams).toHaveLength(0);

		// Celina (inna grupa) nie widzi kolokwium Anny
		const otherRes = await request("GET", "/exams?view=group", { token: tokenC });
		const otherBody = (await otherRes.json()) as { exams: unknown[] };
		expect(otherBody.exams).toHaveLength(0);
	});
});

describe("/materials", () => {
	test("group members share materials with author attribution", async () => {
		const createRes = await request("POST", "/materials", {
			token: tokenA,
			body: {
				title: "Notatki z wykladu 1",
				kind: "notatki",
				url: "https://example.com/notatki.pdf",
				courseName: "Fizyka",
			},
		});
		expect(createRes.status).toBe(201);

		const listResB = await request("GET", "/materials", { token: tokenB });
		expect(listResB.status).toBe(200);
		const bodyB = (await listResB.json()) as {
			materials: Array<{ title: string; authorName: string; kind: string }>;
		};
		expect(bodyB.materials).toHaveLength(1);
		expect(bodyB.materials[0].title).toBe("Notatki z wykladu 1");
		expect(bodyB.materials[0].authorName).toBe("Anna Kowalska");

		// Celina (inna grupa) nie widzi materialow grupy 32_1
		const listResC = await request("GET", "/materials", { token: tokenC });
		const bodyC = (await listResC.json()) as { materials: unknown[] };
		expect(bodyC.materials).toHaveLength(0);
	});

	test("rejects invalid kind", async () => {
		const res = await request("POST", "/materials", {
			token: tokenA,
			body: { title: "Cos", kind: "memy" },
		});
		expect(res.status).toBe(422);
	});
});
