import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { courses, exams, semesters, users } from "../../db/schema";
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

			if (!currentUser.groupId) {
				set.status = 400;
				return {
					message: "User has no group selected.",
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
					groupId: currentUser.groupId,
					createdBy: currentUser.id,
					courseId: body.courseId,
					date: body.date,
					scope: body.scope ?? null,
					createdAt,
				})
				.returning({
					id: exams.id,
					groupId: exams.groupId,
					createdBy: exams.createdBy,
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

		if (!currentUser.groupId) {
			set.status = 400;
			return {
				message: "User has no group selected.",
			};
		}

		const rows = db
			.select({
				id: exams.id,
				groupId: exams.groupId,
				createdBy: exams.createdBy,
				courseId: exams.courseId,
				courseName: courses.name,
				date: exams.date,
				scope: exams.scope,
				createdAt: exams.createdAt,
				authorName: users.displayName,
			})
			.from(exams)
			.innerJoin(courses, eq(exams.courseId, courses.id))
			.innerJoin(users, eq(exams.createdBy, users.id))
			.where(eq(exams.groupId, currentUser.groupId))
			.orderBy(asc(exams.date), asc(exams.id))
			.all();

		return {
			exams: rows,
		};
	});
