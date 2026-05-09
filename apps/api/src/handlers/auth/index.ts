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

function getCurrentTimestamp(): string {
	return new Date().toISOString();
}

function generateSalt(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export const authRoutes = new Elysia({ prefix: "/auth" }).post(
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
);
