import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-exams-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-jwt-secret";

const { authRoutes } = await import("../handlers/auth/index");
const { examsRoutes } = await import("../handlers/exams/index");
const { db } = await import("../db/client");
const { courses, semesters, users } = await import("../db/schema");
const { eq } = await import("drizzle-orm");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(authRoutes).use(examsRoutes);

function post(path: string, body: unknown, token?: string) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(body),
		}),
	);
}

function get(path: string, token?: string) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "GET",
			headers: token ? { authorization: `Bearer ${token}` } : undefined,
		}),
	);
}

const ownerPayload = {
	email: "exams-owner@example.com",
	password: "VeryStrong123",
	displayName: "Exam Owner",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

const outsiderPayload = {
	email: "exams-outsider@example.com",
	password: "VeryStrong123",
	displayName: "Exam Outsider",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 3,
};

let ownerToken = "";
let ownerCourseId = 0;
let outsiderCourseId = 0;

beforeAll(async () => {
	const ownerRegister = await post("/auth/register", ownerPayload);
	expect(ownerRegister.status).toBe(201);

	const outsiderRegister = await post("/auth/register", outsiderPayload);
	expect(outsiderRegister.status).toBe(201);

	const ownerLogin = await post("/auth/login", {
		email: ownerPayload.email,
		password: ownerPayload.password,
	});
	expect(ownerLogin.status).toBe(200);
	ownerToken = ((await ownerLogin.json()) as { token: string }).token;

	const ownerUser = db.select({ id: users.id }).from(users).where(eq(users.email, ownerPayload.email)).get();
	const outsiderUser = db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, outsiderPayload.email))
		.get();

	if (!ownerUser || !outsiderUser) {
		throw new Error("Failed to resolve seeded users for exams tests.");
	}

	const now = new Date().toISOString();
	const ownerSemester = db
		.insert(semesters)
		.values({
			userId: ownerUser.id,
			name: "Semestr 4",
			academicYear: "2026/2027",
			term: "winter",
			isActive: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: semesters.id })
		.get();
	const outsiderSemester = db
		.insert(semesters)
		.values({
			userId: outsiderUser.id,
			name: "Semestr 6",
			academicYear: "2026/2027",
			term: "summer",
			isActive: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: semesters.id })
		.get();

	ownerCourseId = db
		.insert(courses)
		.values({
			semesterId: ownerSemester.id,
			name: "Bazy Danych",
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: courses.id })
		.get().id;
	outsiderCourseId = db
		.insert(courses)
		.values({
			semesterId: outsiderSemester.id,
			name: "Systemy Operacyjne",
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: courses.id })
		.get().id;
});

describe("POST /exams", () => {
	test("creates exam for authenticated user course", async () => {
		const response = await post(
			"/exams",
			{
				courseId: ownerCourseId,
				date: "2026-06-15T10:00:00.000Z",
				scope: "Rozdzialy 1-5 i SQL joins",
			},
			ownerToken,
		);

		expect(response.status).toBe(201);

		const body = (await response.json()) as {
			exam: {
				courseId: number;
				courseName: string;
				scope: string | null;
			};
		};

		expect(body.exam.courseId).toBe(ownerCourseId);
		expect(body.exam.courseName).toBe("Bazy Danych");
		expect(body.exam.scope).toBe("Rozdzialy 1-5 i SQL joins");
	});

	test("returns 401 when authorization header is missing", async () => {
		const response = await post("/exams", {
			courseId: ownerCourseId,
			date: "2026-06-20T08:00:00.000Z",
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});

	test("returns 404 when course does not belong to current user", async () => {
		const response = await post(
			"/exams",
			{
				courseId: outsiderCourseId,
				date: "2026-06-20T08:00:00.000Z",
			},
			ownerToken,
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			message: "Course not found for current user.",
		});
	});
});

describe("GET /exams", () => {
	test("returns current user exams ordered by date", async () => {
		const secondCreate = await post(
			"/exams",
			{
				courseId: ownerCourseId,
				date: "2026-06-10T08:00:00.000Z",
				scope: "Model relacyjny",
			},
			ownerToken,
		);
		expect(secondCreate.status).toBe(201);

		const response = await get("/exams", ownerToken);
		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			exams: Array<{
				courseId: number;
				courseName: string;
				date: string;
			}>;
		};

		expect(body.exams).toHaveLength(2);
		expect(body.exams[0].courseId).toBe(ownerCourseId);
		expect(body.exams[0].courseName).toBe("Bazy Danych");
		expect(body.exams[0].date).toBe("2026-06-10T08:00:00.000Z");
		expect(body.exams[1].date).toBe("2026-06-15T10:00:00.000Z");
	});

	test("returns 401 when authorization header is missing", async () => {
		const response = await get("/exams");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});
});
