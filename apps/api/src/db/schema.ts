import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
	"users",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		email: text("email").notNull(),
		displayName: text("display_name").notNull(),
		university: text("university"),
		fieldOfStudy: text("field_of_study"),
		yearOfStudy: integer("year_of_study"),
		groupId: text("group_id"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		emailUniqueIdx: uniqueIndex("users_email_unique").on(table.email),
	}),
);

export const authCredentials = sqliteTable(
	"auth_credentials",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		email: text("email").notNull(),
		passwordHash: text("password_hash").notNull(),
		salt: text("salt").notNull(),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		userIdUniqueIdx: uniqueIndex("auth_credentials_user_id_unique").on(table.userId),
		emailUniqueIdx: uniqueIndex("auth_credentials_email_unique").on(table.email),
	}),
);

export const semesters = sqliteTable(
	"semesters",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		name: text("name").notNull(),
		academicYear: text("academic_year").notNull(),
		term: text("term").notNull(),
		startsAt: text("starts_at"),
		endsAt: text("ends_at"),
		isActive: integer("is_active").notNull().default(0),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		userIdIdx: index("idx_semesters_user_id").on(table.userId),
	}),
);

export const courses = sqliteTable(
	"courses",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		semesterId: integer("semester_id")
			.notNull()
			.references(() => semesters.id),
		name: text("name").notNull(),
		code: text("code"),
		lecturerName: text("lecturer_name"),
		room: text("room"),
		meetingLink: text("meeting_link"),
		meetingCode: text("meeting_code"),
		color: text("color"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		semesterIdIdx: index("idx_courses_semester_id").on(table.semesterId),
	}),
);

export const timetableImports = sqliteTable(
	"timetable_imports",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		semesterId: integer("semester_id").references(() => semesters.id),
		sourceKind: text("source_kind").notNull(),
		sourceUrl: text("source_url"),
		sourceFilename: text("source_filename"),
		importedAt: text("imported_at").notNull(),
		status: text("status").notNull(),
		importedSectionsCount: integer("imported_sections_count").notNull().default(0),
		importedEntriesCount: integer("imported_entries_count").notNull().default(0),
		errorMessage: text("error_message"),
	},
	(table) => ({
		userIdIdx: index("idx_timetable_imports_user_id").on(table.userId),
		semesterIdIdx: index("idx_timetable_imports_semester_id").on(table.semesterId),
		importedAtIdx: index("idx_timetable_imports_imported_at").on(table.importedAt),
	}),
);

export const classSessions = sqliteTable(
	"class_sessions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		courseId: integer("course_id")
			.notNull()
			.references(() => courses.id),
		timetableImportId: integer("timetable_import_id").references(() => timetableImports.id),
		sessionType: text("session_type").notNull(),
		title: text("title").notNull(),
		startsAt: text("starts_at").notNull(),
		endsAt: text("ends_at").notNull(),
		weekday: integer("weekday"),
		recurrenceRule: text("recurrence_rule"),
		room: text("room"),
		lecturerName: text("lecturer_name"),
		notes: text("notes"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		courseIdIdx: index("idx_class_sessions_course_id").on(table.courseId),
		timetableImportIdIdx: index("idx_class_sessions_timetable_import_id").on(table.timetableImportId),
		startsAtIdx: index("idx_class_sessions_starts_at").on(table.startsAt),
	}),
);

export const exams = sqliteTable(
	"exams",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		userId: integer("user_id")
			.notNull()
			.references(() => users.id),
		courseId: integer("course_id")
			.notNull()
			.references(() => courses.id),
		date: text("date").notNull(),
		scope: text("scope"),
		createdAt: text("created_at").notNull(),
	},
	(table) => ({
		userIdIdx: index("idx_exams_user_id").on(table.userId),
		courseIdIdx: index("idx_exams_course_id").on(table.courseId),
		dateIdx: index("idx_exams_date").on(table.date),
	}),
);

export const scheduleChanges = sqliteTable(
	"schedule_changes",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		scheduleId: text("schedule_id").notNull(),
		changeType: text("change_type").notNull(),
		changedAt: text("changed_at").notNull(),
		prevDataJson: text("prev_data_json"),
	},
	(table) => ({
		scheduleIdIdx: index("idx_schedule_changes_schedule_id").on(table.scheduleId),
		changedAtIdx: index("idx_schedule_changes_changed_at").on(table.changedAt),
		changeTypeIdx: index("idx_schedule_changes_change_type").on(table.changeType),
	}),
);

export const scheduleMeta = sqliteTable("schedule_meta", {
	id: integer("id").primaryKey(),
	xlsFilename: text("xls_filename").notNull(),
	sourceUrl: text("source_url").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const sections = sqliteTable(
	"sections",
	{
		id: text("id").primaryKey(),
		label: text("label").notNull(),
		yearSemLabel: text("year_sem_label").notNull(),
		groupId: text("group_id").notNull(),
	},
	(table) => ({
		groupIdIdx: index("idx_sections_group_id").on(table.groupId),
	}),
);

export const entries = sqliteTable(
	"entries",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		sectionId: text("section_id")
			.notNull()
			.references(() => sections.id),
		time: text("time").notNull(),
		date: text("date").notNull(),
		subject: text("subject").notNull(),
		subjectNormalized: text("subject_normalized").notNull(),
	},
	(table) => ({
		sectionIdIdx: index("idx_entries_section_id").on(table.sectionId),
		subjectNormalizedIdx: index("idx_entries_subject_normalized").on(table.subjectNormalized),
	}),
);

export const lecturers = sqliteTable(
	"lecturers",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		abbr: text("abbr").notNull(),
		abbrNormalized: text("abbr_normalized").notNull(),
		name: text("name").notNull(),
		email: text("email").notNull(),
	},
	(table) => ({
		abbrNormalizedIdx: index("idx_lecturers_abbr_normalized").on(table.abbrNormalized),
		abbrNameUniqueIdx: uniqueIndex("lecturers_abbr_name_unique").on(table.abbr, table.name),
	}),
);
