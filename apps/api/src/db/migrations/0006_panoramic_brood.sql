CREATE TABLE `schedule_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`schedule_id` text NOT NULL,
	`change_type` text NOT NULL,
	`changed_at` text NOT NULL,
	`prev_data_json` text
);
--> statement-breakpoint
CREATE INDEX `idx_schedule_changes_schedule_id` ON `schedule_changes` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `idx_schedule_changes_changed_at` ON `schedule_changes` (`changed_at`);--> statement-breakpoint
CREATE INDEX `idx_schedule_changes_change_type` ON `schedule_changes` (`change_type`);