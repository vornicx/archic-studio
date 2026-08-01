ALTER TABLE `projects` ADD `headline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `subheadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `hero_image_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `github_repo_full_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `github_repo_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `github_default_branch` text DEFAULT 'main' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `github_last_push_at` text DEFAULT '' NOT NULL;