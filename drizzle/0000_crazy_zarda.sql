CREATE TABLE `conversation_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_conversation_tags_conversation_id` ON `conversation_tags` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_conversation_tags_tag_id` ON `conversation_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_user_id_unique` ON `conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_user_id` ON `conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_conversations_deleted_at` ON `conversations` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tokens_used` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`deleted_at` text,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_id` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_deleted_at` ON `messages` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#00ffff' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);