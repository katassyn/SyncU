import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { userEvents } from "../../db/schema";
import { getAuthenticatedUser, getCurrentTimestamp } from "../auth/shared";

/**
 * Wlasne wydarzenia usera w planie (poza importowanym planem PK):
 *  - GET    /events      -> { events } (wszystkie wydarzenia zalogowanego usera)
 *  - POST   /events      -> 201 { event }
 *  - DELETE /events/:id  -> 200 { deleted: true } / 404
 *
 * Frontend merguje je klientsko z publicznym planem grupy (/schedule/group/:id),
 * wiec format daty to YYYY-MM-DD a czasu HH:MM (24h).
 */

const createEventBody = t.Object({
	title: t.String({ minLength: 1, maxLength: 200 }),
	date: t.String({ format: "date" }),
	startTime: t.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }),
	endTime: t.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" }),
	room: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
});

export const eventsRoutes = new Elysia({ prefix: "/events" })
	.get("/", async ({ headers, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		const rows = db
			.select()
			.from(userEvents)
			.where(eq(userEvents.userId, currentUser.id))
			.orderBy(asc(userEvents.date), asc(userEvents.startTime))
			.all();

		return {
			events: rows,
		};
	})
	.post(
		"/",
		async ({ headers, body, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			if (body.endTime <= body.startTime) {
				set.status = 400;
				return {
					message: "End time must be after start time.",
				};
			}

			const insertedEvent = db
				.insert(userEvents)
				.values({
					userId: currentUser.id,
					title: body.title,
					date: body.date,
					startTime: body.startTime,
					endTime: body.endTime,
					room: body.room ?? null,
					createdAt: getCurrentTimestamp(),
				})
				.returning()
				.get();

			set.status = 201;
			return {
				event: insertedEvent,
			};
		},
		{
			body: createEventBody,
		},
	)
	.delete(
		"/:id",
		async ({ headers, params, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			const deleted = db
				.delete(userEvents)
				.where(and(eq(userEvents.id, params.id), eq(userEvents.userId, currentUser.id)))
				.returning({ id: userEvents.id })
				.get();

			if (!deleted) {
				set.status = 404;
				return {
					message: "Event not found.",
				};
			}

			return {
				deleted: true,
			};
		},
		{
			params: t.Object({
				id: t.Numeric({ minimum: 1 }),
			}),
		},
	);
