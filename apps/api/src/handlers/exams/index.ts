import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { courses, exams, semesters } from "../../db/schema";
import { getAuthenticatedUser, getCurrentTimestamp } from "../auth/shared";

const createExamBody = t.Object({
	courseId: t.Number({ minimum: 1 }),
	date: t.String({ format: "date-time" }),
	scope: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
});

export const examsRoutes = new Elysia({ prefix: "/exams" })
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

			const course = db
				.select({
					id: courses.id,
					name: courses.name,
				})
				.from(courses)
				.innerJoin(semesters, eq(courses.semesterId, semesters.id))
				.where(and(eq(courses.id, body.courseId), eq(semesters.userId, currentUser.id)))
				.get();

			if (!course) {
				set.status = 404;
				return {
					message: "Course not found for current user.",
				};
			}

			const createdAt = getCurrentTimestamp();
			const insertedExam = db
				.insert(exams)
				.values({
					userId: currentUser.id,
					courseId: body.courseId,
					date: body.date,
					scope: body.scope ?? null,
					createdAt,
				})
				.returning({
					id: exams.id,
					userId: exams.userId,
					courseId: exams.courseId,
					date: exams.date,
					scope: exams.scope,
					createdAt: exams.createdAt,
				})
				.get();

			set.status = 201;
			return {
				exam: {
					...insertedExam,
					courseName: course.name,
				},
			};
		},
		{
			body: createExamBody,
		},
	)
	.get("/", async ({ headers, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		const rows = db
			.select({
				id: exams.id,
				userId: exams.userId,
				courseId: exams.courseId,
				courseName: courses.name,
				date: exams.date,
				scope: exams.scope,
				createdAt: exams.createdAt,
			})
			.from(exams)
			.innerJoin(courses, eq(exams.courseId, courses.id))
			.where(eq(exams.userId, currentUser.id))
			.orderBy(asc(exams.date), asc(exams.id))
			.all();

		return {
			exams: rows,
		};
	});
