CREATE TABLE `timetable_imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`semester_id` integer,
	`source_kind` text NOT NULL,
	`source_url` text,
	`source_filename` text,
	`imported_at` text NOT NULL,
	`status` text NOT NULL,
	`imported_sections_count` integer DEFAULT 0 NOT NULL,
	`imported_entries_count` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_timetable_imports_user_id` ON `timetable_imports` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_timetable_imports_semester_id` ON `timetable_imports` (`semester_id`);--> statement-breakpoint
CREATE INDEX `idx_timetable_imports_imported_at` ON `timetable_imports` (`imported_at`);--> statement-breakpoint
ALTER TABLE `class_sessions` ADD `timetable_import_id` integer REFERENCES timetable_imports(id);--> statement-breakpoint
CREATE INDEX `idx_class_sessions_timetable_import_id` ON `class_sessions` (`timetable_import_id`);