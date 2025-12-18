import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_conversations_user_id').on(table.userId),
  index('idx_conversations_deleted_at').on(table.deletedAt),
]);

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used'), // Track AI token usage for cost analytics
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_messages_conversation_id').on(table.conversationId),
  index('idx_messages_deleted_at').on(table.deletedAt),
]);

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#00ffff'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const conversationTags = sqliteTable('conversation_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  tagId: integer('tag_id').notNull().references(() => tags.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_conversation_tags_conversation_id').on(table.conversationId),
  index('idx_conversation_tags_tag_id').on(table.tagId),
]);

// Configuration table for admin settings
export const config = sqliteTable('config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(), // e.g., 'system_prompt', 'temperature'
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text('updated_by'), // Admin identifier if needed
});

// Configuration history for audit trail
export const configHistory = sqliteTable('config_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  configKey: text('config_key').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value').notNull(),
  changedAt: text('changed_at').default(sql`CURRENT_TIMESTAMP`),
  changedBy: text('changed_by'),
}, (table) => [
  index('idx_config_history_key').on(table.configKey),
]);

// Rate limit logs for moderation
export const rateLimitLogs = sqliteTable('rate_limit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ip: text('ip').notNull(),
  userId: text('user_id'),
  blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
  endpoint: text('endpoint').default('/api/chat'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_rate_limit_logs_ip').on(table.ip),
  index('idx_rate_limit_logs_created_at').on(table.createdAt),
]);

// Flagged conversations for moderation review
export const flaggedConversations = sqliteTable('flagged_conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  reason: text('reason').notNull(), // 'spam', 'abuse', 'suspicious', 'repeated'
  severity: text('severity', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  details: text('details'), // JSON string with additional info
  reviewed: integer('reviewed', { mode: 'boolean' }).notNull().default(false),
  reviewedAt: text('reviewed_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_flagged_conversation_id').on(table.conversationId),
  index('idx_flagged_reviewed').on(table.reviewed),
]);

// Type exports for convenience
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ConversationTag = typeof conversationTags.$inferSelect;
export type NewConversationTag = typeof conversationTags.$inferInsert;
export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type ConfigHistory = typeof configHistory.$inferSelect;
export type NewConfigHistory = typeof configHistory.$inferInsert;
export type RateLimitLog = typeof rateLimitLogs.$inferSelect;
export type NewRateLimitLog = typeof rateLimitLogs.$inferInsert;
export type FlaggedConversation = typeof flaggedConversations.$inferSelect;
export type NewFlaggedConversation = typeof flaggedConversations.$inferInsert;
