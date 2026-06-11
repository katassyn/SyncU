PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `exams_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text NOT NULL,
	`created_by` integer NOT NULL,
	`course_id` integer NOT NULL,
	`date` text NOT NULL,
	`scope` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `exams_new` (`id`, `group_id`, `created_by`, `course_id`, `date`, `scope`, `created_at`)
SELECT
	`exams`.`id`,
	COALESCE(`users`.`group_id`, 'legacy-user-' || `exams`.`user_id`),
	`exams`.`user_id`,
	`exams`.`course_id`,
	`exams`.`date`,
	`exams`.`scope`,
	`exams`.`created_at`
FROM `exams`
INNER JOIN `users` ON `exams`.`user_id` = `users`.`id`;
--> statement-breakpoint
DROP TABLE `exams`;
--> statement-breakpoint
ALTER TABLE `exams_new` RENAME TO `exams`;
--> statement-breakpoint
CREATE INDEX `idx_exams_group_id` ON `exams` (`group_id`);
--> statement-breakpoint
CREATE INDEX `idx_exams_created_by` ON `exams` (`created_by`);
--> statement-breakpoint
CREATE INDEX `idx_exams_course_id` ON `exams` (`course_id`);
--> statement-breakpoint
CREATE INDEX `idx_exams_date` ON `exams` (`date`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
