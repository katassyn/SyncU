import { and, eq, gte, lt } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { importTimetable } from "@syncu/core";
import type { ClassSession, Course, ImportResult, WeekParity, WeekSchedule } from "@syncu/types";
import { db } from "../../db/client";
import {
	classSessions,
	courses,
	semesters,
	timetableImports,
	users,
} from "../../db/schema";

const confirmImportBody = t.Object({
	user: t.Object({
		email: t.String({ format: "email" }),
		displayName: t.String(),
		university: t.Optional(t.Nullable(t.String())),
		fieldOfStudy: t.Optional(t.Nullable(t.String())),
		yearOfStudy: t.Optional(t.Nullable(t.Number())),
	}),
	semester: t.Object({
		name: t.String(),
		academicYear: t.String(),
		term: t.String(),
		startsAt: t.Optional(t.Nullable(t.String())),
		endsAt: t.Optional(t.Nullable(t.String())),
		isActive: t.Optional(t.Boolean()),
	}),
	source: t.Object({
		kind: t.String(),
		url: t.Optional(t.Nullable(t.String())),
		filename: t.Optional(t.Nullable(t.String())),
	}),
	section: t.Object({
		id: t.String(),
		label: t.String(),
		yearSemLabel: t.String(),
		groupId: t.Union([t.Number(), t.String()]),
		entries: t.Array(
			t.Object({
				time: t.String(),
				date: t.String(),
				subject: t.String(),
			}),
		),
	}),
});

function normalizeTimePart(value: string): string {
	const normalized = value.trim().replace(".", ":");
	const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

	if (!match) {
		throw new Error(`Invalid time format: "${value}"`);
	}

	return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeDatePart(value: string, fallbackYear: number): string {
	const trimmed = value.trim();

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}

	const shortMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})$/);
	if (!shortMatch) {
		throw new Error(`Invalid date format: "${value}"`);
	}

	const [, day, month] = shortMatch;
	return `${fallbackYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function mapEntryToDateTimes(date: string, time: string, fallbackYear: number) {
	const parts = time.split("-");
	if (parts.length !== 2) {
		throw new Error(`Invalid time range: "${time}"`);
	}

	const startsAt = `${normalizeDatePart(date, fallbackYear)}T${normalizeTimePart(parts[0])}:00`;
	const endsAt = `${normalizeDatePart(date, fallbackYear)}T${normalizeTimePart(parts[1])}:00`;

	return { startsAt, endsAt };
}

function getCurrentTimestamp(): string {
	return new Date().toISOString();
}

function isSpreadsheetFile(filename: string): boolean {
	return /\.(xlsx|xls)$/i.test(filename);
}

function parseIsoDate(value: string): Date {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) {
		throw new Error(`Invalid date query parameter: "${value}"`);
	}

	const [, year, month, day] = match;
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid date query parameter: "${value}"`);
	}

	return date;
}

function formatIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

function getWeekBounds(date: Date) {
	const day = date.getUTCDay();
	const distanceFromMonday = day === 0 ? 6 : day - 1;
	const weekStart = addUtcDays(date, -distanceFromMonday);
	const weekEnd = addUtcDays(weekStart, 6);
	const nextWeekStart = addUtcDays(weekStart, 7);

	return { weekStart, weekEnd, nextWeekStart };
}

function getIsoWeek(date: Date): number {
	const thursday = addUtcDays(date, 3 - ((date.getUTCDay() + 6) % 7));
	const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
	const normalizedFirstThursday = addUtcDays(
		firstThursday,
		3 - ((firstThursday.getUTCDay() + 6) % 7),
	);

	return (
		1 +
		Math.round(
			(thursday.getTime() - normalizedFirstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
		)
	);
}

function getWeekParity(date: Date): WeekParity {
	return getIsoWeek(date) % 2 === 0 ? "even" : "odd";
}

export const timetableRoutes = new Elysia({ prefix: "/timetable" })
	.post("/import", async ({ request, set }) => {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			set.status = 400;
			return { message: "Missing file field." };
		}

		if (!isSpreadsheetFile(file.name)) {
			set.status = 400;
			return { message: "File must be in .xls or .xlsx format." };
		}

		try {
			const buffer = await file.arrayBuffer();
			const parsed = importTimetable(buffer);

			return {
				fileName: file.name,
				selectedSectionId: parsed.sections[0]?.id ?? null,
				sectionCount: parsed.sections.length,
				lecturerCount: parsed.lecturers.length,
				data: parsed,
			};
		} catch (error) {
			set.status = 400;
			return {
				message: error instanceof Error ? error.message : "Timetable import failed.",
			};
		}
	})
	.get(
		"/week",
		({ query, set }) => {
			try {
				const selectedDate = parseIsoDate(query.date);
				const { weekStart, weekEnd, nextWeekStart } = getWeekBounds(selectedDate);

				const rows = db
					.select({
						sessionId: classSessions.id,
						courseId: courses.id,
						timetableImportId: classSessions.timetableImportId,
						sessionType: classSessions.sessionType,
						title: classSessions.title,
						startsAt: classSessions.startsAt,
						endsAt: classSessions.endsAt,
						weekday: classSessions.weekday,
						recurrenceRule: classSessions.recurrenceRule,
						sessionRoom: classSessions.room,
						sessionLecturerName: classSessions.lecturerName,
						notes: classSessions.notes,
						sessionCreatedAt: classSessions.createdAt,
						sessionUpdatedAt: classSessions.updatedAt,
						semesterId: courses.semesterId,
						courseName: courses.name,
						courseCode: courses.code,
						courseLecturerName: courses.lecturerName,
						courseRoom: courses.room,
						meetingLink: courses.meetingLink,
						meetingCode: courses.meetingCode,
						color: courses.color,
						courseCreatedAt: courses.createdAt,
						courseUpdatedAt: courses.updatedAt,
					})
					.from(classSessions)
					.innerJoin(courses, eq(classSessions.courseId, courses.id))
					.innerJoin(semesters, eq(courses.semesterId, semesters.id))
					.where(
						and(
							eq(semesters.isActive, 1),
							gte(classSessions.startsAt, `${formatIsoDate(weekStart)}T00:00:00`),
							lt(classSessions.startsAt, `${formatIsoDate(nextWeekStart)}T00:00:00`),
						),
					)
					.all();

				const coursesById = new Map<number, Course>();
				const sessions: ClassSession[] = [];

				for (const row of rows) {
					if (!coursesById.has(row.courseId)) {
						coursesById.set(row.courseId, {
							id: row.courseId,
							semesterId: row.semesterId,
							name: row.courseName,
							code: row.courseCode,
							lecturerName: row.courseLecturerName,
							room: row.courseRoom,
							meetingLink: row.meetingLink,
							meetingCode: row.meetingCode,
							color: row.color,
							createdAt: row.courseCreatedAt,
							updatedAt: row.courseUpdatedAt,
						});
					}

					sessions.push({
						id: row.sessionId,
						courseId: row.courseId,
						timetableImportId: row.timetableImportId,
						sessionType: row.sessionType as ClassSession["sessionType"],
						title: row.title,
						startsAt: row.startsAt,
						endsAt: row.endsAt,
						weekday: row.weekday,
						recurrenceRule: row.recurrenceRule,
						room: row.sessionRoom,
						lecturerName: row.sessionLecturerName,
						notes: row.notes,
						createdAt: row.sessionCreatedAt,
						updatedAt: row.sessionUpdatedAt,
					});
				}

				const response: WeekSchedule = {
					weekStart: formatIsoDate(weekStart),
					weekEnd: formatIsoDate(weekEnd),
					weekParity: getWeekParity(selectedDate),
					courses: [...coursesById.values()],
					sessions,
				};

				return response;
			} catch (error) {
				set.status = 400;
				return {
					message: error instanceof Error ? error.message : "Failed to fetch week schedule.",
				};
			}
		},
		{
			query: t.Object({
				date: t.String({ format: "date" }),
			}),
		},
	)
	.post(
	"/import/confirm",
	({ body, set }) => {
		if (body.section.entries.length === 0) {
			set.status = 400;
			return { message: "Section must contain at least one entry." };
		}

		try {
			const result = db.transaction((tx) => {
				const now = getCurrentTimestamp();
				const fallbackYear = new Date().getUTCFullYear();

				const existingUser = tx
					.select()
					.from(users)
					.where(eq(users.email, body.user.email))
					.get();

				const userId =
					existingUser?.id ??
					tx
						.insert(users)
						.values({
							email: body.user.email,
							displayName: body.user.displayName,
							university: body.user.university ?? null,
							fieldOfStudy: body.user.fieldOfStudy ?? null,
							yearOfStudy: body.user.yearOfStudy ?? null,
							createdAt: now,
							updatedAt: now,
						})
						.returning({ id: users.id })
						.get().id;

				if (existingUser) {
					tx
						.update(users)
						.set({
							displayName: body.user.displayName,
							university: body.user.university ?? null,
							fieldOfStudy: body.user.fieldOfStudy ?? null,
							yearOfStudy: body.user.yearOfStudy ?? null,
							updatedAt: now,
						})
						.where(eq(users.id, existingUser.id))
						.run();
				}

				const existingSemester = tx
					.select()
					.from(semesters)
					.where(
						and(
							eq(semesters.userId, userId),
							eq(semesters.name, body.semester.name),
							eq(semesters.academicYear, body.semester.academicYear),
							eq(semesters.term, body.semester.term),
						),
					)
					.get();

				const semesterId =
					existingSemester?.id ??
					tx
						.insert(semesters)
						.values({
							userId,
							name: body.semester.name,
							academicYear: body.semester.academicYear,
							term: body.semester.term,
							startsAt: body.semester.startsAt ?? null,
							endsAt: body.semester.endsAt ?? null,
							isActive: body.semester.isActive ? 1 : 0,
							createdAt: now,
							updatedAt: now,
						})
						.returning({ id: semesters.id })
						.get().id;

				const importRecord = tx
					.insert(timetableImports)
					.values({
						userId,
						semesterId,
						sourceKind: body.source.kind,
						sourceUrl: body.source.url ?? null,
						sourceFilename: body.source.filename ?? null,
						importedAt: now,
						status: "completed",
						importedSectionsCount: 1,
						importedEntriesCount: body.section.entries.length,
						errorMessage: null,
					})
					.returning()
					.get();

				const courseIdsByName = new Map<string, number>();
				const existingCourses = tx
					.select()
					.from(courses)
					.where(eq(courses.semesterId, semesterId))
					.all();

				for (const course of existingCourses) {
					courseIdsByName.set(course.name, course.id);
				}

				for (const entry of body.section.entries) {
					if (!courseIdsByName.has(entry.subject)) {
						const insertedCourse = tx
							.insert(courses)
							.values({
								semesterId,
								name: entry.subject,
								code: null,
								lecturerName: null,
								room: null,
								meetingLink: null,
								meetingCode: null,
								color: null,
								createdAt: now,
								updatedAt: now,
							})
							.returning({ id: courses.id, name: courses.name })
							.get();

						courseIdsByName.set(insertedCourse.name, insertedCourse.id);
					}

					const { startsAt, endsAt } = mapEntryToDateTimes(
						entry.date,
						entry.time,
						fallbackYear,
					);

					tx.insert(classSessions).values({
						courseId: courseIdsByName.get(entry.subject)!,
						timetableImportId: importRecord.id,
						sessionType: "lecture",
						title: entry.subject,
						startsAt,
						endsAt,
						weekday: null,
						recurrenceRule: null,
						room: null,
						lecturerName: null,
						notes: `${body.section.label} (${body.section.id})`,
						createdAt: now,
						updatedAt: now,
					}).run();
				}

				const importResult: ImportResult = {
					id: importRecord.id,
					userId: importRecord.userId,
					semesterId: importRecord.semesterId,
					sourceKind: importRecord.sourceKind,
					sourceUrl: importRecord.sourceUrl,
					sourceFilename: importRecord.sourceFilename,
					importedAt: importRecord.importedAt,
					status: importRecord.status as ImportResult["status"],
					importedSectionsCount: importRecord.importedSectionsCount,
					importedEntriesCount: importRecord.importedEntriesCount,
					errorMessage: importRecord.errorMessage,
				};

				return {
					importResult,
					courseCount: courseIdsByName.size,
					classSessionCount: body.section.entries.length,
				};
			});

			set.status = 201;
			return result;
		} catch (error) {
			set.status = 400;
			return {
				message: error instanceof Error ? error.message : "Import confirmation failed.",
			};
		}
	},
	{
		body: confirmImportBody,
	},
);
