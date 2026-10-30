CREATE TABLE `biodata_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`introduction` text NOT NULL,
	`template` text DEFAULT 'saffron' NOT NULL,
	`photo_key` text,
	`profile_json` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `biodata_profiles_owner_idx` ON `biodata_profiles` (`owner_id`);
