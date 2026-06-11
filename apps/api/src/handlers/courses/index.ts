import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { classSessions, courses, exams, semesters } from "../../db/schema";
import { getAuthenticatedUser } from "../auth/shared";

/**
 * GET /courses     - przedmioty zalogowanego usera (picker kolokwiow).
 * GET /courses/:id - szczegoly przedmiotu: zajecia (class_sessions) + kolokwia.
 *                    Ownership przez semesters.userId = me; cudzy id -> 404.
 */
export const coursesRoutes = new Elysia()
	.get("/courses", async ({ headers, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		const rows = db
			.select({
				id: courses.id,
				name: courses.name,
				semesterId: courses.semesterId,
			})
			.from(courses)
			.innerJoin(semesters, eq(courses.semesterId, semesters.id))
			.where(eq(semesters.userId, currentUser.id))
			.orderBy(asc(courses.name), asc(courses.id))
			.all();

		return {
			courses: rows,
		};
	})
	.get(
		"/courses/:id",
		async ({ headers, params, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			const course = db
				.select({
					id: courses.id,
					name: courses.name,
					semesterId: courses.semesterId,
					lecturerName: courses.lecturerName,
					room: courses.room,
				})
				.from(courses)
				.innerJoin(semesters, eq(courses.semesterId, semesters.id))
				.where(and(eq(courses.id, params.id), eq(semesters.userId, currentUser.id)))
				.get();

			if (!course) {
				set.status = 404;
				return {
					message: "Course not found for current user.",
				};
			}

			const sessions = db
				.select({
					id: classSessions.id,
					sessionType: classSessions.sessionType,
					title: classSessions.title,
					startsAt: classSessions.startsAt,
					endsAt: classSessions.endsAt,
					room: classSessions.room,
					lecturerName: classSessions.lecturerName,
				})
				.from(classSessions)
				.where(eq(classSessions.courseId, course.id))
				.orderBy(asc(classSessions.startsAt), asc(classSessions.id))
				.all();

			const courseExams = db
				.select({
					id: exams.id,
					date: exams.date,
					scope: exams.scope,
					createdAt: exams.createdAt,
				})
				.from(exams)
				.where(and(eq(exams.courseId, course.id), eq(exams.createdBy, currentUser.id)))
				.orderBy(asc(exams.date), asc(exams.id))
				.all();

			return {
				course,
				sessions,
				exams: courseExams,
			};
		},
		{
			params: t.Object({
				id: t.Numeric({ minimum: 1 }),
			}),
		},
	);
