import { asc, eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { getAuthenticatedUser } from "../auth/shared";

/**
 * G-13: czlonkowie grupy zalogowanego usera.
 * GET /groups/members -> { groupId, members: [{ id, displayName, fieldOfStudy, yearOfStudy }] }
 * Bez emaili - tylko dane widoczne publicznie w ramach grupy.
 */
export const groupsRoutes = new Elysia({ prefix: "/groups" }).get(
	"/members",
	async ({ headers, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		if (!currentUser.groupId) {
			set.status = 400;
			return {
				message: "User has no group selected.",
			};
		}

		const members = db
			.select({
				id: users.id,
				displayName: users.displayName,
				fieldOfStudy: users.fieldOfStudy,
				yearOfStudy: users.yearOfStudy,
			})
			.from(users)
			.where(eq(users.groupId, currentUser.groupId))
			.orderBy(asc(users.displayName), asc(users.id))
			.all();

		return {
			groupId: currentUser.groupId,
			members,
		};
	},
);
