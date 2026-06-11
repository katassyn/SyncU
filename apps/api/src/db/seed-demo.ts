import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { eq, inArray } from "drizzle-orm";
import { db, sqlite } from "./client";
import {
	authCredentials,
	classSessions,
	courses,
	exams,
	materials,
	semesters,
	userEvents,
	users,
} from "./schema";
import { generateSalt, getCurrentTimestamp } from "../handlers/auth/shared";

const DEMO_GROUP_ID = "DEMO_32_1";
const DEMO_PASSWORD = "DemoStrong123!";
const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR ?? "./data/uploads");

const demoUsers = [
	{
		email: "demo.anna@syncu.test",
		displayName: "Anna Demo",
		fieldOfStudy: "Informatyka",
		yearOfStudy: 2,
	},
	{
		email: "demo.bartek@syncu.test",
		displayName: "Bartek Demo",
		fieldOfStudy: "Informatyka",
		yearOfStudy: 2,
	},
	{
		email: "demo.celina@syncu.test",
		displayName: "Celina Demo",
		fieldOfStudy: "Informatyka",
		yearOfStudy: 2,
	},
] as const;

const demoFiles = [
	{
		storedName: "11111111-1111-4111-8111-111111111111.pdf",
		title: "Bazy danych - notatki z normalizacji",
		courseName: "Bazy danych",
		mimeType: "application/pdf",
		content: "Demo PDF: notatki z normalizacji, kluczy i postaci normalnych.\n",
		uploadedByEmail: "demo.anna@syncu.test",
	},
	{
		storedName: "22222222-2222-4222-8222-222222222222.pdf",
		title: "Algorytmy - zestaw z grafow",
		courseName: "Algorytmy i struktury danych",
		mimeType: "application/pdf",
		content: "Demo PDF: BFS, DFS, Dijkstra, sortowanie topologiczne.\n",
		uploadedByEmail: "demo.bartek@syncu.test",
	},
	{
		storedName: "33333333-3333-4333-8333-333333333333.txt",
		title: "Projekt zespolowy - checklist przed demo",
		courseName: "Projekt zespolowy",
		mimeType: "text/plain; charset=utf-8",
		content: "Demo checklist: backlog, podzial zadan, plan prezentacji, ryzyka.\n",
		uploadedByEmail: "demo.celina@syncu.test",
	},
] as const;

type DemoUser = (typeof demoUsers)[number];

async function hashPassword(password: string) {
	const salt = generateSalt();
	const passwordHash = await Bun.password.hash(`${password}:${salt}`, {
		algorithm: "argon2id",
	});

	return { salt, passwordHash };
}

async function createUser(user: DemoUser) {
	const now = getCurrentTimestamp();
	const insertedUser = db
		.insert(users)
		.values({
			email: user.email,
			displayName: user.displayName,
			university: "Politechnika Krakowska",
			fieldOfStudy: user.fieldOfStudy,
			yearOfStudy: user.yearOfStudy,
			groupId: DEMO_GROUP_ID,
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.get();

	const { salt, passwordHash } = await hashPassword(DEMO_PASSWORD);
	db.insert(authCredentials)
		.values({
			userId: insertedUser.id,
			email: user.email,
			passwordHash,
			salt,
			createdAt: now,
			updatedAt: now,
		})
		.run();

	return insertedUser;
}

function deleteExistingDemoData() {
	db.delete(materials).where(eq(materials.groupId, DEMO_GROUP_ID)).run();
	sqlite.run("DELETE FROM schedule_changes WHERE schedule_id LIKE ?", [`${DEMO_GROUP_ID}%`]);

	const existingUsers = db
		.select({ id: users.id })
		.from(users)
		.where(inArray(users.email, demoUsers.map((user) => user.email)))
		.all();
	const userIds = existingUsers.map((user) => user.id);

	if (userIds.length === 0) {
		return;
	}

	const semesterRows = db
		.select({ id: semesters.id })
		.from(semesters)
		.where(inArray(semesters.userId, userIds))
		.all();
	const semesterIds = semesterRows.map((semester) => semester.id);

	if (semesterIds.length > 0) {
		const courseRows = db
			.select({ id: courses.id })
			.from(courses)
			.where(inArray(courses.semesterId, semesterIds))
			.all();
		const courseIds = courseRows.map((course) => course.id);

		if (courseIds.length > 0) {
			db.delete(exams).where(inArray(exams.courseId, courseIds)).run();
			db.delete(classSessions).where(inArray(classSessions.courseId, courseIds)).run();
			db.delete(courses).where(inArray(courses.id, courseIds)).run();
		}

		db.delete(semesters).where(inArray(semesters.id, semesterIds)).run();
	}

	db.delete(userEvents).where(inArray(userEvents.userId, userIds)).run();
	db.delete(authCredentials).where(inArray(authCredentials.userId, userIds)).run();
	db.delete(users).where(inArray(users.id, userIds)).run();
}

function seedScheduleCache() {
	const now = getCurrentTimestamp();
	sqlite.run(
		"INSERT OR REPLACE INTO schedule_meta (id, xls_filename, source_url, updated_at) VALUES (1, ?, ?, ?)",
		["demo-plan-syncu.xlsx", "demo://syncu/plan", now],
	);

	for (const section of [
		{ id: DEMO_GROUP_ID, label: "Demo 32_1", yearSemLabel: "Rok 2 / Semestr 4" },
		{ id: "DEMO_32_2", label: "Demo 32_2", yearSemLabel: "Rok 2 / Semestr 4" },
	]) {
		sqlite.run(
			"INSERT OR REPLACE INTO sections (id, label, year_sem_label, group_id) VALUES (?, ?, ?, ?)",
			[section.id, section.label, section.yearSemLabel, section.id],
		);
		sqlite.run("DELETE FROM entries WHERE section_id = ?", [section.id]);
	}

	const entries = [
		[DEMO_GROUP_ID, "8.00-9.30", "15.06", "Bazy danych lab dr Nowak s. 207"],
		[DEMO_GROUP_ID, "9.45-11.15", "15.06", "Algorytmy wyklad dr Kowalska A1"],
		[DEMO_GROUP_ID, "11.30-13.00", "16.06", "Projekt zespolowy cwiczenia s. 115"],
		[DEMO_GROUP_ID, "13.15-14.45", "17.06", "Sieci komputerowe lab s. 303"],
		["DEMO_32_2", "8.00-9.30", "15.06", "Bazy danych lab dr Nowak s. 208"],
	];
	for (const [sectionId, time, date, subject] of entries) {
		sqlite.run(
			"INSERT INTO entries (section_id, time, date, subject, subject_normalized) VALUES (?, ?, ?, ?, ?)",
			[sectionId, time, date, subject, subject.toLowerCase()],
		);
	}

	for (const lecturer of [
		["JN", "jn", "dr Jan Nowak", "jan.nowak@pk.edu.pl"],
		["AK", "ak", "dr Anna Kowalska", "anna.kowalska@pk.edu.pl"],
	]) {
		sqlite.run(
			"INSERT OR IGNORE INTO lecturers (abbr, abbr_normalized, name, email) VALUES (?, ?, ?, ?)",
			lecturer,
		);
	}

	sqlite.run(
		"INSERT INTO schedule_changes (schedule_id, change_type, changed_at, prev_data_json) VALUES (?, ?, ?, ?)",
		[
			`${DEMO_GROUP_ID}:15.06:8.00-9.30:Bazy danych`,
			"modified",
			now,
			JSON.stringify({
				time: "8.00-9.30",
				date: "15.06",
				subject: "Bazy danych lab dr Nowak s. 117",
			}),
		],
	);
}

function writeDemoFiles() {
	mkdirSync(UPLOADS_DIR, { recursive: true });

	for (const file of demoFiles) {
		const filePath = join(UPLOADS_DIR, file.storedName);
		if (!existsSync(filePath)) {
			writeFileSync(filePath, file.content, "utf8");
		}
	}
}

async function seedDemo() {
	deleteExistingDemoData();
	writeDemoFiles();

	const insertedUsers = new Map<string, Awaited<ReturnType<typeof createUser>>>();
	for (const user of demoUsers) {
		insertedUsers.set(user.email, await createUser(user));
	}

	const anna = insertedUsers.get("demo.anna@syncu.test")!;
	const bartek = insertedUsers.get("demo.bartek@syncu.test")!;
	const celina = insertedUsers.get("demo.celina@syncu.test")!;
	const now = getCurrentTimestamp();

	const annaSemester = db
		.insert(semesters)
		.values({
			userId: anna.id,
			name: "Semestr letni 2025/2026",
			academicYear: "2025/2026",
			term: "summer",
			startsAt: "2026-02-23",
			endsAt: "2026-06-28",
			isActive: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: semesters.id })
		.get();

	const bartekSemester = db
		.insert(semesters)
		.values({
			userId: bartek.id,
			name: "Semestr letni 2025/2026",
			academicYear: "2025/2026",
			term: "summer",
			startsAt: "2026-02-23",
			endsAt: "2026-06-28",
			isActive: 1,
			createdAt: now,
			updatedAt: now,
		})
		.returning({ id: semesters.id })
		.get();

	const courseRows = [
		{
			semesterId: annaSemester.id,
			name: "Bazy danych",
			code: "BD-204",
			lecturerName: "dr Jan Nowak",
			room: "207",
			color: "#2563eb",
		},
		{
			semesterId: annaSemester.id,
			name: "Algorytmy i struktury danych",
			code: "AISD-202",
			lecturerName: "dr Anna Kowalska",
			room: "A1",
			color: "#16a34a",
		},
		{
			semesterId: annaSemester.id,
			name: "Projekt zespolowy",
			code: "PZ-210",
			lecturerName: "mgr Piotr Lis",
			room: "115",
			color: "#9333ea",
		},
		{
			semesterId: bartekSemester.id,
			name: "Bazy danych",
			code: "BD-204",
			lecturerName: "dr Jan Nowak",
			room: "208",
			color: "#2563eb",
		},
	];

	const insertedCourses = new Map<string, { id: number }>();
	for (const course of courseRows) {
		const insertedCourse = db
			.insert(courses)
			.values({
				...course,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: courses.id })
			.get();
		insertedCourses.set(`${course.semesterId}:${course.name}`, insertedCourse);
	}

	const annaDatabases = insertedCourses.get(`${annaSemester.id}:Bazy danych`)!;
	const annaAlgorithms = insertedCourses.get(`${annaSemester.id}:Algorytmy i struktury danych`)!;
	const annaProject = insertedCourses.get(`${annaSemester.id}:Projekt zespolowy`)!;
	const bartekDatabases = insertedCourses.get(`${bartekSemester.id}:Bazy danych`)!;

	for (const session of [
		{
			courseId: annaDatabases.id,
			sessionType: "lab",
			title: "Bazy danych - laboratorium",
			startsAt: "2026-06-15T08:00:00.000Z",
			endsAt: "2026-06-15T09:30:00.000Z",
			weekday: 1,
			room: "207",
			lecturerName: "dr Jan Nowak",
		},
		{
			courseId: annaAlgorithms.id,
			sessionType: "lecture",
			title: "Algorytmy - wyklad",
			startsAt: "2026-06-15T09:45:00.000Z",
			endsAt: "2026-06-15T11:15:00.000Z",
			weekday: 1,
			room: "A1",
			lecturerName: "dr Anna Kowalska",
		},
		{
			courseId: annaProject.id,
			sessionType: "practice",
			title: "Projekt zespolowy - sprint review",
			startsAt: "2026-06-16T11:30:00.000Z",
			endsAt: "2026-06-16T13:00:00.000Z",
			weekday: 2,
			room: "115",
			lecturerName: "mgr Piotr Lis",
		},
	]) {
		db.insert(classSessions)
			.values({
				...session,
				recurrenceRule: "weekly",
				notes: null,
				createdAt: now,
				updatedAt: now,
			})
			.run();
	}

	for (const exam of [
		{
			groupId: DEMO_GROUP_ID,
			createdBy: anna.id,
			courseId: annaDatabases.id,
			date: "2026-06-20T10:00:00.000Z",
			scope: "SQL joins, indeksy, normalizacja 1NF-3NF",
		},
		{
			groupId: DEMO_GROUP_ID,
			createdBy: bartek.id,
			courseId: annaAlgorithms.id,
			date: "2026-06-24T08:30:00.000Z",
			scope: "Grafy, Dijkstra, BFS/DFS, zlozonosc obliczeniowa",
		},
		{
			groupId: DEMO_GROUP_ID,
			createdBy: celina.id,
			courseId: annaProject.id,
			date: "2026-06-27T12:00:00.000Z",
			scope: "Prezentacja MVP i dokumentacja decyzji technicznych",
		},
		{
			groupId: DEMO_GROUP_ID,
			createdBy: bartek.id,
			courseId: bartekDatabases.id,
			date: "2026-06-30T09:00:00.000Z",
			scope: "Powtorka SQL dla drugiej kopii przedmiotu w grupie",
		},
	]) {
		db.insert(exams).values({ ...exam, createdAt: now }).run();
	}

	for (const file of demoFiles) {
		const uploadedBy = insertedUsers.get(file.uploadedByEmail)!;
		db.insert(materials)
			.values({
				groupId: DEMO_GROUP_ID,
				courseName: file.courseName,
				title: file.title,
				fileUrl: `/files/${file.storedName}`,
				fileSize: Buffer.byteLength(file.content),
				mimeType: file.mimeType,
				uploadedBy: uploadedBy.id,
				createdAt: now,
			})
			.run();
	}

	for (const event of [
		{
			userId: anna.id,
			title: "Konsultacje z baz danych",
			date: "2026-06-18",
			startTime: "14:00",
			endTime: "14:45",
			room: "207",
		},
		{
			userId: bartek.id,
			title: "Przygotowanie do kolokwium z algorytmow",
			date: "2026-06-22",
			startTime: "18:00",
			endTime: "19:30",
			room: "Discord",
		},
	]) {
		db.insert(userEvents).values({ ...event, createdAt: now }).run();
	}

	seedScheduleCache();

	console.log("Demo seed applied.");
	console.log(`Group: ${DEMO_GROUP_ID}`);
	console.log(`Password for all demo users: ${DEMO_PASSWORD}`);
	for (const user of demoUsers) {
		console.log(`- ${user.email} (${user.displayName})`);
	}
}

await seedDemo();
