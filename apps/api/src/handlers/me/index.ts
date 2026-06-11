import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { authCredentials, users } from "../../db/schema";
import {
	generateSalt,
	getAuthenticatedUser,
	getCurrentTimestamp,
	toAuthUser,
	validatePasswordStrength,
} from "../auth/shared";

const patchMeBody = t.Object({
	displayName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
	university: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
	fieldOfStudy: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
	yearOfStudy: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 10 }))),
	groupId: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
	currentPassword: t.Optional(t.String({ minLength: 8, maxLength: 128 })),
	newPassword: t.Optional(t.String({ minLength: 8, maxLength: 128 })),
});

const changePasswordBody = t.Object({
	currentPassword: t.String({ minLength: 8, maxLength: 128 }),
	newPassword: t.String({ minLength: 8, maxLength: 128 }),
});

async function changePasswordForUser(
	userId: number,
	currentPassword: string,
	newPassword: string,
	set: { status?: unknown },
) {
	const passwordError = validatePasswordStrength(newPassword);
	if (passwordError) {
		set.status = 400;
		return { response: { message: passwordError } };
	}

	const credential = db
		.select({
			id: authCredentials.id,
			passwordHash: authCredentials.passwordHash,
			salt: authCredentials.salt,
		})
		.from(authCredentials)
		.where(eq(authCredentials.userId, userId))
		.get();

	if (!credential) {
		set.status = 404;
		return { response: { message: "Credentials not found." } };
	}

	const isCurrentValid = await Bun.password.verify(
		`${currentPassword}:${credential.salt}`,
		credential.passwordHash,
	);

	if (!isCurrentValid) {
		set.status = 400;
		return { response: { message: "Current password is incorrect." } };
	}

	const newSalt = generateSalt();
	const newHash = await Bun.password.hash(`${newPassword}:${newSalt}`, {
		algorithm: "argon2id",
	});

	db.update(authCredentials)
		.set({
			passwordHash: newHash,
			salt: newSalt,
			updatedAt: getCurrentTimestamp(),
		})
		.where(eq(authCredentials.id, credential.id))
		.run();

	return { response: null };
}

export const meRoutes = new Elysia()
	.patch(
		"/me/password",
		async ({ headers, body, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			const changeResult = await changePasswordForUser(
				currentUser.id,
				body.currentPassword,
				body.newPassword,
				set,
			);
			if (changeResult.response) return changeResult.response;

			return {
				changed: true,
			};
		},
		{
			body: changePasswordBody,
		},
	)
	.patch(
		"/me",
		async ({ headers, body, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			if (
				body.displayName === undefined &&
				body.university === undefined &&
				body.fieldOfStudy === undefined &&
				body.yearOfStudy === undefined &&
				body.groupId === undefined &&
				body.currentPassword === undefined &&
				body.newPassword === undefined
			) {
				set.status = 400;
				return {
					message: "At least one profile field must be provided.",
				};
			}

			if (
				(body.currentPassword === undefined && body.newPassword !== undefined) ||
				(body.currentPassword !== undefined && body.newPassword === undefined)
			) {
				set.status = 400;
				return {
					message: "Both currentPassword and newPassword must be provided to change password.",
				};
			}

			if (body.currentPassword !== undefined && body.newPassword !== undefined) {
				const changeResult = await changePasswordForUser(
					currentUser.id,
					body.currentPassword,
					body.newPassword,
					set,
				);
				if (changeResult.response) return changeResult.response;
			}

			const now = getCurrentTimestamp();
			const updatedUser = db
				.update(users)
				.set({
					displayName: body.displayName === undefined ? currentUser.displayName : body.displayName,
					university: body.university === undefined ? currentUser.university : body.university,
					fieldOfStudy: body.fieldOfStudy === undefined ? currentUser.fieldOfStudy : body.fieldOfStudy,
					yearOfStudy: body.yearOfStudy === undefined ? currentUser.yearOfStudy : body.yearOfStudy,
					groupId: body.groupId === undefined ? currentUser.groupId : body.groupId,
					updatedAt: now,
				})
				.where(eq(users.id, currentUser.id))
				.returning({
					id: users.id,
					email: users.email,
					displayName: users.displayName,
					university: users.university,
					fieldOfStudy: users.fieldOfStudy,
					yearOfStudy: users.yearOfStudy,
					groupId: users.groupId,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.get();

			return {
				user: toAuthUser(updatedUser),
			};
		},
		{
			body: patchMeBody,
		},
	);
