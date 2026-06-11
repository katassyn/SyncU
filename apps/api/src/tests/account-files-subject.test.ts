import { afterAll, describe, expect, test } from "bun:test";
import { rmSync, unlinkSync } from "fs";
import { Elysia } from "elysia";

const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const TEST_DB_PATH = `/tmp/syncu-test-account-files-${RUN_ID}.db`;
const TEST_UPLOADS_DIR = `/tmp/syncu-test-uploads-${RUN_ID}`;

process.env.DB_PATH = TEST_DB_PATH;
process.env.UPLOADS_DIR = TEST_UPLOADS_DIR;
process.env.JWT_SECRET = "test-jwt-secret";

const { authRoutes } = await import("../handlers/auth/index");
const { meRoutes } = await import("../handlers/me/index");
const { coursesRoutes } = await import("../handlers/courses/index");
const { examsRoutes } = await import("../handlers/exams/index");
const { filesRoutes, materialsRoutes } = await import("../handlers/materials/index");
const { db } = await import("../db/client");
const { classSessions, courses, semesters } = await import("../db/schema");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
	try {
		rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
	} catch {}
}

afterAll(cleanup);

const app = new Elysia()
	.use(authRoutes)
	.use(meRoutes)
	.use(coursesRoutes)
	.use(examsRoutes)
	.use(materialsRoutes)
	.use(filesRoutes);

function jsonRequest(
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

async function login(email: string, password: string) {
	return jsonRequest("POST", "/auth/login", { body: { email, password } });
}

async function registerAndLogin(email: string, displayName: string): Promise<string> {
	const registerResponse = await jsonRequest("POST", "/auth/register", {
		body: { email, password: "VeryStrong123!", displayName },
	});
	expect(registerResponse.status).toBe(201);

	const loginResponse = await login(email, "VeryStrong123!");
	expect(loginResponse.status).toBe(200);
	const { token } = (await loginResponse.json()) as { token: string };
	return token;
}

async function getUserId(token: string): Promise<number> {
	const res = await jsonRequest("GET", "/auth/me", { token });
	expect(res.status).toBe(200);
	const { user } = (await res.json()) as { user: { id: number } };
	return user.id;
}

const tokenDawid = await registerAndLogin("dawid@example.com", "Dawid Haslo");
const tokenEwa = await registerAndLogin("ewa@example.com", "Ewa Plikowa");

describe("PATCH /me/password", () => {
	test("rejects wrong current password", async () => {
		const res = await jsonRequest("PATCH", "/me/password", {
			token: tokenDawid,
			body: { currentPassword: "ZleHaslo123", newPassword: "NoweHaslo456!" },
		});
		expect(res.status).toBe(400);
	});

	test("changes password: old login stops working, new works", async () => {
		const res = await jsonRequest("PATCH", "/me/password", {
			token: tokenDawid,
			body: { currentPassword: "VeryStrong123!", newPassword: "NoweHaslo456!" },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ changed: true });

		const oldLogin = await login("dawid@example.com", "VeryStrong123!");
		expect(oldLogin.status).toBe(401);

		const newLogin = await login("dawid@example.com", "NoweHaslo456!");
		expect(newLogin.status).toBe(200);
	});

	test("returns 401 without token", async () => {
		const res = await jsonRequest("PATCH", "/me/password", {
			body: { currentPassword: "VeryStrong123!", newPassword: "NoweHaslo456!" },
		});
		expect(res.status).toBe(401);
	});
});

describe("GET /courses/:id", () => {
	test("returns own course with sessions and exams, 404 for someone else's", async () => {
		const ewaId = await getUserId(tokenEwa);
		const now = new Date().toISOString();

		const groupRes = await jsonRequest("PATCH", "/me", {
			token: tokenEwa,
			body: { groupId: "77_9" },
		});
		expect(groupRes.status).toBe(200);

		const semester = db
			.insert(semesters)
			.values({
				userId: ewaId,
				name: "Semestr letni",
				academicYear: "2025/2026",
				term: "letni",
				isActive: 1,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: semesters.id })
			.get();

		const course = db
			.insert(courses)
			.values({
				semesterId: semester.id,
				name: "Algorytmy",
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: courses.id })
			.get();

		db.insert(classSessions)
			.values({
				courseId: course.id,
				sessionType: "lecture",
				title: "Algorytmy",
				startsAt: "2026-06-20T09:00:00",
				endsAt: "2026-06-20T10:30:00",
				createdAt: now,
				updatedAt: now,
			})
			.run();

		const examRes = await jsonRequest("POST", "/exams", {
			token: tokenEwa,
			body: { courseId: course.id, date: "2026-06-27T10:00:00.000Z", scope: "Grafy" },
		});
		expect(examRes.status).toBe(201);

		const detailRes = await jsonRequest("GET", `/courses/${course.id}`, { token: tokenEwa });
		expect(detailRes.status).toBe(200);
		const detail = (await detailRes.json()) as {
			course: { name: string };
			sessions: Array<{ title: string }>;
			exams: Array<{ scope: string | null }>;
		};
		expect(detail.course.name).toBe("Algorytmy");
		expect(detail.sessions).toHaveLength(1);
		expect(detail.exams).toHaveLength(1);
		expect(detail.exams[0].scope).toBe("Grafy");

		// Dawid nie ma dostepu do przedmiotu Ewy
		const foreignRes = await jsonRequest("GET", `/courses/${course.id}`, {
			token: tokenDawid,
		});
		expect(foreignRes.status).toBe(404);
	});
});

describe("POST /materials + GET /files/:name", () => {
	test("uploads a file and serves it back", async () => {
		// Ewa musi miec grupe, zeby dodawac materialy. Grupa unikalna dla tego
		// pliku - testy wspoldziela proces (i baze), wiec "32_1" z
		// group-sharing.test.ts widzialoby te materialy w swoich asercjach.
		const groupRes = await jsonRequest("PATCH", "/me", {
			token: tokenEwa,
			body: { groupId: "77_9" },
		});
		expect(groupRes.status).toBe(200);

		const fileBytes = new TextEncoder().encode("PDF-udawany test content");
		const formData = new FormData();
		formData.append(
			"file",
			new File([fileBytes], "notatki z wykładu.pdf", { type: "application/pdf" }),
		);
		formData.append("title", "Notatki PDF");
		formData.append("courseName", "Algorytmy");

		const uploadRes = await app.handle(
			new Request("http://localhost/materials", {
				method: "POST",
				headers: { authorization: `Bearer ${tokenEwa}` },
				body: formData,
			}),
		);
		expect(uploadRes.status).toBe(201);
		const { material } = (await uploadRes.json()) as {
			material: { fileUrl: string; fileSize: number; mimeType: string; title: string };
		};
		expect(material.title).toBe("Notatki PDF");
		expect(material.fileUrl).toMatch(/^\/files\/[0-9a-f-]{36}\.pdf$/);
		expect(material.fileSize).toBe(fileBytes.byteLength);
		expect(material.mimeType).toBe("application/pdf");

		// Serwowanie pliku (bez tokenu - <a href> nie wysyla Bearera)
		const fileRes = await app.handle(new Request(`http://localhost${material.fileUrl}`));
		expect(fileRes.status).toBe(200);
		expect(fileRes.headers.get("content-type")).toBe("application/pdf");
		const served = new Uint8Array(await fileRes.arrayBuffer());
		expect(served).toEqual(fileBytes);
	});

	test("rejects disallowed extension and path traversal", async () => {
		const formData = new FormData();
		formData.append("file", new File([new Uint8Array([1, 2, 3])], "wirus.exe"));

		const uploadRes = await app.handle(
			new Request("http://localhost/materials", {
				method: "POST",
				headers: { authorization: `Bearer ${tokenEwa}` },
				body: formData,
			}),
		);
		expect(uploadRes.status).toBe(400);

		const traversalRes = await app.handle(
			new Request("http://localhost/files/..%2F..%2Fschedule.db"),
		);
		expect(traversalRes.status).toBe(404);
	});
});
