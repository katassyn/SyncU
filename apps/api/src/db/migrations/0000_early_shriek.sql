CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_id` text NOT NULL,
	`time` text NOT NULL,
	`date` text NOT NULL,
	`subject` text NOT NULL,
	`subject_normalized` text NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entries_section_id` ON `entries` (`section_id`);--> statement-breakpoint
CREATE INDEX `idx_entries_subject_normalized` ON `entries` (`subject_normalized`);--> statement-breakpoint
CREATE TABLE `lecturers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`abbr` text NOT NULL,
	`abbr_normalized` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lecturers_abbr_normalized` ON `lecturers` (`abbr_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `lecturers_abbr_name_unique` ON `lecturers` (`abbr`,`name`);--> statement-breakpoint
CREATE TABLE `schedule_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`xls_filename` text NOT NULL,
	`source_url` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`year_sem_label` text NOT NULL,
	`group_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sections_group_id` ON `sections` (`group_id`);