CREATE TABLE `config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_by` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `config_key_unique` ON `config` (`key`);--> statement-breakpoint
CREATE TABLE `config_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`config_key` text NOT NULL,
	`old_value` text,
	`new_value` text NOT NULL,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP,
	`changed_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_config_history_key` ON `config_history` (`config_key`);--> statement-breakpoint
CREATE TABLE `flagged_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`reason` text NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`details` text,
	`reviewed` integer DEFAULT false NOT NULL,
	`reviewed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_flagged_conversation_id` ON `flagged_conversations` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_flagged_reviewed` ON `flagged_conversations` (`reviewed`);--> statement-breakpoint
CREATE TABLE `rate_limit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`user_id` text,
	`blocked` integer DEFAULT false NOT NULL,
	`endpoint` text DEFAULT '/api/chat',
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limit_logs_ip` ON `rate_limit_logs` (`ip`);--> statement-breakpoint
CREATE INDEX `idx_rate_limit_logs_created_at` ON `rate_limit_logs` (`created_at`);