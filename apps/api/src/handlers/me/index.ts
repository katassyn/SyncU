import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { getAuthenticatedUser, getCurrentTimestamp, toAuthUser } from "../auth/shared";

const patchMeBody = t.Object({
	fieldOfStudy: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
	yearOfStudy: t.Optional(t.Nullable(t.Number({ minimum: 1, maximum: 10 }))),
	groupId: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
});

export const meRoutes = new Elysia()
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
				body.fieldOfStudy === undefined &&
				body.yearOfStudy === undefined &&
				body.groupId === undefined
			) {
				set.status = 400;
				return {
					message: "At least one profile field must be provided.",
				};
			}

			const now = getCurrentTimestamp();
			const updatedUser = db
				.update(users)
				.set({
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
