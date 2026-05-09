CREATE TABLE `auth_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_credentials_user_id_unique` ON `auth_credentials` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_credentials_email_unique` ON `auth_credentials` (`email`);