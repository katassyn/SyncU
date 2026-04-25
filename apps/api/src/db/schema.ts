import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
