import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";

const TEST_DB_PATH = `/tmp/syncu-test-me-patch-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;
process.env.JWT_SECRET = "test-jwt-secret";

const { authRoutes } = await import("../handlers/auth/index");
const { meRoutes } = await import("../handlers/me/index");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(authRoutes).use(meRoutes);

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

function patch(path: string, body: unknown, token?: string) {
	return app.handle(
		new Request(`http://localhost${path}`, {
			method: "PATCH",
			headers: {
				"content-type": "application/json",
				...(token ? { authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(body),
		}),
	);
}

const registrationPayload = {
	email: "profile@example.com",
	password: "VeryStrong123!",
	displayName: "Kamil Gebala",
	university: "Politechnika Krakowska",
	fieldOfStudy: "Informatyka",
	yearOfStudy: 2,
};

describe("PATCH /me", () => {
	test("updates profile fields for authenticated user", async () => {
		const registerResponse = await post("/auth/register", registrationPayload);
		expect(registerResponse.status).toBe(201);

		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);

		const loginBody = (await loginResponse.json()) as { token: string };
		const response = await patch(
			"/me",
			{
				fieldOfStudy: "Informatyka Stosowana",
				yearOfStudy: 3,
				groupId: "32_1",
			},
			loginBody.token,
		);

		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			user: {
				email: string;
				fieldOfStudy: string | null;
				yearOfStudy: number | null;
				groupId: string | null;
			};
		};

		expect(body.user.email).toBe(registrationPayload.email);
		expect(body.user.fieldOfStudy).toBe("Informatyka Stosowana");
		expect(body.user.yearOfStudy).toBe(3);
		expect(body.user.groupId).toBe("32_1");
	});

	test("updates account identity fields for authenticated user", async () => {
		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);

		const loginBody = (await loginResponse.json()) as { token: string };
		const response = await patch(
			"/me",
			{
				displayName: "Kamil G.",
				university: "Akademia Gorniczo-Hutnicza",
			},
			loginBody.token,
		);

		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			user: {
				email: string;
				displayName: string;
				university: string | null;
				fieldOfStudy: string | null;
				yearOfStudy: number | null;
				groupId: string | null;
			};
		};

		expect(body.user.email).toBe(registrationPayload.email);
		expect(body.user.displayName).toBe("Kamil G.");
		expect(body.user.university).toBe("Akademia Gorniczo-Hutnicza");
		expect(body.user.fieldOfStudy).toBe("Informatyka Stosowana");
		expect(body.user.yearOfStudy).toBe(3);
		expect(body.user.groupId).toBe("32_1");
	});

	test("returns 401 when authorization header is missing", async () => {
		const response = await patch("/me", {
			yearOfStudy: 3,
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			message: "Unauthorized.",
		});
	});

	test("returns 400 when no profile field is provided", async () => {
		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);

		const loginBody = (await loginResponse.json()) as { token: string };
		const response = await patch("/me", {}, loginBody.token);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "At least one profile field must be provided.",
		});
	});

	test("changes password through PATCH /me after verifying current password", async () => {
		const payload = {
			email: "profile-password@example.com",
			password: "VeryStrong123!",
			displayName: "Password User",
		};
		const registerResponse = await post("/auth/register", payload);
		expect(registerResponse.status).toBe(201);

		const loginResponse = await post("/auth/login", {
			email: payload.email,
			password: payload.password,
		});
		expect(loginResponse.status).toBe(200);
		const loginBody = (await loginResponse.json()) as { token: string };

		const response = await patch(
			"/me",
			{
				displayName: "Password User Updated",
				currentPassword: payload.password,
				newPassword: "ChangedStrong123!",
			},
			loginBody.token,
		);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { user: { email: string; displayName: string } };
		expect(body.user.email).toBe(payload.email);
		expect(body.user.displayName).toBe("Password User Updated");

		const oldLogin = await post("/auth/login", {
			email: payload.email,
			password: payload.password,
		});
		expect(oldLogin.status).toBe(401);

		const newLogin = await post("/auth/login", {
			email: payload.email,
			password: "ChangedStrong123!",
		});
		expect(newLogin.status).toBe(200);
	});

	test("requires both password fields when changing password through PATCH /me", async () => {
		const loginResponse = await post("/auth/login", {
			email: registrationPayload.email,
			password: registrationPayload.password,
		});
		expect(loginResponse.status).toBe(200);
		const loginBody = (await loginResponse.json()) as { token: string };

		const response = await patch(
			"/me",
			{
				newPassword: "ChangedStrong123!",
			},
			loginBody.token,
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "Both currentPassword and newPassword must be provided to change password.",
		});
	});
});
