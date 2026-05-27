import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { authCredentials, users } from "../../db/schema";
import {
	generateSalt,
	getAuthenticatedUser,
	getCurrentTimestamp,
	getCurrentUnixTimestamp,
	signJwt,
	toAuthUser,
} from "./shared";

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
					groupId: null,
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
			user: toAuthUser(insertedUser),
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
				groupId: users.groupId,
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
			user: toAuthUser({
				id: credential.userId,
				email: credential.email,
				displayName: credential.displayName,
				university: credential.university,
				fieldOfStudy: credential.fieldOfStudy,
				yearOfStudy: credential.yearOfStudy,
				groupId: credential.groupId,
				createdAt: credential.createdAt,
				updatedAt: credential.updatedAt,
			}),
		};
	},
	{
		body: loginBody,
	},
)
	.get("/me", async ({ headers, set }) => {
		const user = await getAuthenticatedUser(headers.authorization);

		if (!user) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		return {
			user: toAuthUser(user),
		};
	})
	.post("/logout", async ({ headers, set }) => {
		const user = await getAuthenticatedUser(headers.authorization);

		if (!user) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		return {
			message: "Logged out successfully.",
		};
	});
