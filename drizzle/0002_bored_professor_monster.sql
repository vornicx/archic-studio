ALTER TABLE `clients` ADD `registry_data` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `professional_data` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `brief_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `legal_profile_json` text DEFAULT '{}' NOT NULL;