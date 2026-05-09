import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-auth-register-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { authRoutes } = await import("../handlers/auth/index");
const { sqlite } = await import("../db/client");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(authRoutes);

function req(body: unknown) {
	return app.handle(
		new Request("http://localhost/auth/register", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(body),
		}),
	);
}

const validPayload = {
	email: "register@example.com",
	password: "VeryStrong123",
	displayName: "Kamil Gebala",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

describe("POST /auth/register", () => {
	test("creates user and auth credentials with hashed password", async () => {
		const response = await req(validPayload);

		expect(response.status).toBe(201);

		const body = (await response.json()) as {
			user: {
				id: number;
				email: string;
				displayName: string;
			};
		};

		expect(body.user.email).toBe(validPayload.email);
		expect(body.user.displayName).toBe(validPayload.displayName);

		const userRow = sqlite
			.query("SELECT id, email, display_name FROM users WHERE email = ?")
			.get(validPayload.email) as { id: number; email: string; display_name: string } | null;
		const credentialRow = sqlite
			.query("SELECT email, password_hash, salt FROM auth_credentials WHERE email = ?")
			.get(validPayload.email) as { email: string; password_hash: string; salt: string } | null;

		expect(userRow).not.toBeNull();
		expect(credentialRow).not.toBeNull();
		expect(credentialRow!.salt.length).toBeGreaterThan(0);
		expect(credentialRow!.password_hash).not.toBe(validPayload.password);

		const verified = await Bun.password.verify(
			`${validPayload.password}:${credentialRow!.salt}`,
			credentialRow!.password_hash,
		);
		expect(verified).toBe(true);
	});

	test("returns conflict when email already exists", async () => {
		const response = await req(validPayload);

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			message: "User with this email already exists.",
		});
	});
});
