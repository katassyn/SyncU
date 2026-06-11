PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `materials_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`course_name` text NOT NULL,
	`title` text NOT NULL,
	`file_url` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`uploaded_by` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `materials_new` (
	`id`,
	`group_id`,
	`course_name`,
	`title`,
	`file_url`,
	`file_size`,
	`mime_type`,
	`uploaded_by`,
	`created_at`
)
SELECT
	`id`,
	`group_id`,
	COALESCE(`course_name`, ''),
	`title`,
	COALESCE(`url`, ''),
	0,
	'application/octet-stream',
	`user_id`,
	`created_at`
FROM `materials`;
--> statement-breakpoint
DROP TABLE `materials`;
--> statement-breakpoint
ALTER TABLE `materials_new` RENAME TO `materials`;
--> statement-breakpoint
CREATE INDEX `idx_materials_group_id` ON `materials` (`group_id`);
--> statement-breakpoint
CREATE INDEX `idx_materials_course_name` ON `materials` (`course_name`);
--> statement-breakpoint
CREATE INDEX `idx_materials_uploaded_by` ON `materials` (`uploaded_by`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
