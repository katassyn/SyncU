import { and, asc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { courses, exams, semesters, users } from "../../db/schema";
import { getAuthenticatedUser, getCurrentTimestamp } from "../auth/shared";

const createExamBody = t.Object({
	courseId: t.Optional(t.Number({ minimum: 1 })),
	// Nazwa przedmiotu z planu PK (frontend wyciaga ja z /schedule/group/:id).
	// Kurs i semestr sa tworzone automatycznie, bo plan jest scrapowany -
	// user nie importuje juz nic recznie.
	courseName: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
	date: t.String({ format: "date-time" }),
	scope: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
});

/**
 * Znajdz kurs usera po nazwie albo zaloz go (wraz z aktywnym semestrem,
 * jesli user jeszcze zadnego nie ma). Plan jest automatyczny, wiec kursy
 * powstaja lazy przy pierwszym kolokwium z danego przedmiotu.
 */
function findOrCreateCourseByName(userId: number, courseName: string) {
	const existing = db
		.select({ id: courses.id, name: courses.name })
		.from(courses)
		.innerJoin(semesters, eq(courses.semesterId, semesters.id))
		.where(and(eq(semesters.userId, userId), eq(courses.name, courseName)))
		.get();

	if (existing) return existing;

	const now = getCurrentTimestamp();

	let semester = db
		.select({ id: semesters.id })
		.from(semesters)
		.where(and(eq(semesters.userId, userId), eq(semesters.isActive, 1)))
		.get();

	if (!semester) {
		const month = new Date().getMonth() + 1;
		const year = new Date().getFullYear();
		const term = month >= 10 || month <= 2 ? "zimowy" : "letni";
		const academicYear = month >= 10 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
		semester = db
			.insert(semesters)
			.values({
				userId,
				name: `Semestr ${term} ${academicYear}`,
				academicYear,
				term,
				isActive: 1,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: semesters.id })
			.get();
	}

	return db
		.insert(courses)
		.values({
			semesterId: semester.id,
			name: courseName,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: courses.id, name: courses.name })
		.get();
}

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

			const trimmedCourseName = body.courseName?.trim();
			if (body.courseId === undefined && !trimmedCourseName) {
				set.status = 400;
				return {
					message: "Either courseId or courseName must be provided.",
				};
			}

			const course = trimmedCourseName
				? findOrCreateCourseByName(currentUser.id, trimmedCourseName)
				: db
						.select({
							id: courses.id,
							name: courses.name,
						})
						.from(courses)
						.innerJoin(semesters, eq(courses.semesterId, semesters.id))
						.where(
							and(eq(courses.id, body.courseId!), eq(semesters.userId, currentUser.id)),
						)
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
					courseId: course.id,
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
