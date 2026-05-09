import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { authCredentials, users } from "../../db/schema";

const registerBody = t.Object({
	email: t.String({ format: "email", maxLength: 255 }),
	password: t.String({ minLength: 8, maxLength: 128 }),
	displayName: t.String({ minLength: 2, maxLength: 100 }),
	university: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
	fieldOfStudy: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
	yearOfStudy: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 10 }))),
});

const loginBody = t.Object({
	email: t.String({ format: "email", maxLength: 255 }),
	password: t.String({ minLength: 8, maxLength: 128 }),
});

function getCurrentTimestamp(): string {
	return new Date().toISOString();
}

function getCurrentUnixTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

function generateSalt(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function getJwtSecret(): string {
	return process.env.JWT_SECRET ?? "syncu-dev-secret";
}

function encodeBase64Url(input: string | Uint8Array): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
	const header = {
		alg: "HS256",
		typ: "JWT",
	};

	const encodedHeader = encodeBase64Url(JSON.stringify(header));
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const data = `${encodedHeader}.${encodedPayload}`;

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(getJwtSecret()),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		new TextEncoder().encode(data),
	);

	return `${data}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export const authRoutes = new Elysia({ prefix: "/auth" })
	.post(
	"/register",
	async ({ body, set }) => {
		const existingCredential = db
			.select({ id: authCredentials.id })
			.from(authCredentials)
			.where(eq(authCredentials.email, body.email))
			.get();

		if (existingCredential) {
			set.status = 409;
			return {
				message: "User with this email already exists.",
			};
		}

		const salt = generateSalt();
		const passwordHash = await Bun.password.hash(`${body.password}:${salt}`, {
			algorithm: "argon2id",
		});
		const now = getCurrentTimestamp();

		const insertedUser = db.transaction((tx) => {
			const user = tx
				.insert(users)
				.values({
					email: body.email,
					displayName: body.displayName,
					university: body.university ?? null,
					fieldOfStudy: body.fieldOfStudy ?? null,
					yearOfStudy: body.yearOfStudy ?? null,
					createdAt: now,
					updatedAt: now,
				})
				.returning()
				.get();

			tx.insert(authCredentials)
				.values({
					userId: user.id,
					email: body.email,
					passwordHash,
					salt,
					createdAt: now,
					updatedAt: now,
				})
				.run();

			return user;
		});

		set.status = 201;
		return {
			user: {
				id: insertedUser.id,
				email: insertedUser.email,
				displayName: insertedUser.displayName,
				university: insertedUser.university,
				fieldOfStudy: insertedUser.fieldOfStudy,
				yearOfStudy: insertedUser.yearOfStudy,
				createdAt: insertedUser.createdAt,
				updatedAt: insertedUser.updatedAt,
			},
		};
	},
	{
		body: registerBody,
	},
)
	.post(
	"/login",
	async ({ body, set }) => {
		const credential = db
			.select({
				userId: authCredentials.userId,
				email: authCredentials.email,
				passwordHash: authCredentials.passwordHash,
				salt: authCredentials.salt,
				displayName: users.displayName,
				university: users.university,
				fieldOfStudy: users.fieldOfStudy,
				yearOfStudy: users.yearOfStudy,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt,
			})
			.from(authCredentials)
			.innerJoin(users, eq(authCredentials.userId, users.id))
			.where(eq(authCredentials.email, body.email))
			.get();

		if (!credential) {
			set.status = 401;
			return {
				message: "Invalid email or password.",
			};
		}

		const isPasswordValid = await Bun.password.verify(
			`${body.password}:${credential.salt}`,
			credential.passwordHash,
		);

		if (!isPasswordValid) {
			set.status = 401;
			return {
				message: "Invalid email or password.",
			};
		}

		const issuedAt = getCurrentUnixTimestamp();
		const expiresAt = issuedAt + 60 * 60 * 24;
		const token = await signJwt({
			sub: credential.userId,
			email: credential.email,
			iat: issuedAt,
			exp: expiresAt,
		});

		return {
			token,
			tokenType: "Bearer",
			expiresAt,
			user: {
				id: credential.userId,
				email: credential.email,
				displayName: credential.displayName,
				university: credential.university,
				fieldOfStudy: credential.fieldOfStudy,
				yearOfStudy: credential.yearOfStudy,
				createdAt: credential.createdAt,
				updatedAt: credential.updatedAt,
			},
		};
	},
	{
		body: loginBody,
	},
);
