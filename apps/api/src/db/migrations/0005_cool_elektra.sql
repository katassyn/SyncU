CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`date` text NOT NULL,
	`scope` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exams_user_id` ON `exams` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_exams_course_id` ON `exams` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_exams_date` ON `exams` (`date`);