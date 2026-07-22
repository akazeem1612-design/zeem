CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` text NOT NULL,
	`first_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`website` text,
	`industry` text NOT NULL,
	`challenge` text,
	`source_path` text,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
