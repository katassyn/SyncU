import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-auth-logout-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-jwt-secret";

const { authRoutes } = await import("../handlers/auth/index");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(authRoutes);

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

const registrationPayload = {
	email: "logout@example.com",
	password: "VeryStrong123",
	displayName: "Kamil Gebala",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

describe("POST /auth/logout", () => {
	test("returns success for a valid bearer token", async () => {
		const registerResponse = await post("/auth/register", registrationPayload);
		expect(registerResponse.status).toBe(201);

		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);

		const loginBody = (await loginResponse.json()) as { token: string };
		const response = await post("/auth/logout", {}, loginBody.token);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			message: "Logged out successfully.",
		});
	});

	test("returns 401 when authorization header is missing", async () => {
		const response = await post("/auth/logout", {});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});

	test("returns 401 for invalid bearer token", async () => {
		const response = await post("/auth/logout", {}, "invalid.token.value");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});
});
