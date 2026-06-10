CREATE TABLE `materials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`group_id` text NOT NULL,
	`course_name` text,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`url` text,
	`content` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_materials_user_id` ON `materials` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_materials_group_id` ON `materials` (`group_id`);--> statement-breakpoint
CREATE TABLE `user_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`room` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_user_events_user_id` ON `user_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_events_date` ON `user_events` (`date`);