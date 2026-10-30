ALTER TABLE `biodata_profiles` ADD `status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `biodata_profiles` ADD `created_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `biodata_profiles` ADD `completed_at` integer;
--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`identifier_type` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`verified_at` integer NOT NULL,
	`last_login_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_identifier_idx` ON `app_users` (`identifier`);
--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`identifier_type` text NOT NULL,
	`code_hash` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_challenges_identifier_created_idx` ON `otp_challenges` (`identifier`,`created_at`);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`identifier` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`actor_identifier` text NOT NULL,
	`actor_role` text NOT NULL,
	`action` text NOT NULL,
	`biodata_id` text,
	`details_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `activity_logs_user_idx` ON `activity_logs` (`user_id`);
