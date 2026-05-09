import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-auth-me-${Date.now()}-${Math.random()
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

function post(path: string, body: unknown) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		}),
	);
}

function get(path: string, token?: string) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "GET",
			headers: token
				? {
						authorization: `Bearer ${token}`,
					}
				: undefined,
		}),
	);
}

const registrationPayload = {
	email: "me@example.com",
	password: "VeryStrong123",
	displayName: "Kamil Gebala",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

describe("GET /auth/me", () => {
	test("returns current user for a valid bearer token", async () => {
		const registerResponse = await post("/auth/register", registrationPayload);
		expect(registerResponse.status).toBe(201);

		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);

		const loginBody = (await loginResponse.json()) as { token: string };
		const response = await get("/auth/me", loginBody.token);

		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			user: {
				email: string;
				displayName: string;
				university: string | null;
				fieldOfStudy: string | null;
				yearOfStudy: number | null;
			};
		};

		expect(body.user.email).toBe(registrationPayload.email);
		expect(body.user.displayName).toBe(registrationPayload.displayName);
		expect(body.user.university).toBe(registrationPayload.university);
		expect(body.user.fieldOfStudy).toBe(registrationPayload.fieldOfStudy);
		expect(body.user.yearOfStudy).toBe(registrationPayload.yearOfStudy);
	});

	test("returns 401 when authorization header is missing", async () => {
		const response = await get("/auth/me");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});

	test("returns 401 for invalid bearer token", async () => {
		const response = await get("/auth/me", "invalid.token.value");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});
});
