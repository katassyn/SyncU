import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-auth-login-${Date.now()}-${Math.random()
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

function req(path: string, body: unknown) {
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

const registrationPayload = {
	email: "login@example.com",
	password: "VeryStrong123",
	displayName: "Kamil Gebala",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

describe("POST /auth/login", () => {
	test("returns JWT token and current user for valid credentials", async () => {
		const registerResponse = await req("/auth/register", registrationPayload);
		expect(registerResponse.status).toBe(201);

		const response = await req("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});

		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			token: string;
			tokenType: string;
			expiresAt: number;
			user: {
				id: number;
				email: string;
				displayName: string;
			};
		};

		expect(body.tokenType).toBe("Bearer");
		expect(body.token.split(".")).toHaveLength(3);
		expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
		expect(body.user.email).toBe(registrationPayload.email);
		expect(body.user.displayName).toBe(registrationPayload.displayName);
	});

	test("returns 401 for unknown email", async () => {
		const response = await req("/auth/login", {
			email: "unknown@example.com",
			password: "VeryStrong123",
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Invalid email or password.",
		});
	});

	test("returns 401 for invalid password", async () => {
		const response = await req("/auth/login", {
			email: registrationPayload.email,
			password: "WrongPassword123",
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Invalid email or password.",
		});
	});
});
