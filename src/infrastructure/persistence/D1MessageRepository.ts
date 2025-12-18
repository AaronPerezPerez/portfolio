/**
 * D1MessageRepository
 * Drizzle/D1 implementation of message persistence
 */

import {
  createDb,
  conversations,
  messages,
  eq,
  desc,
  sql,
  type DrizzleDb,
} from '../../db';
import type { IMessageRepository, ChatMessage } from './IMessageRepository';

export class D1MessageRepository implements IMessageRepository {
  private db: DrizzleDb;

  constructor(d1: D1Database) {
    this.db = createDb(d1);
  }

  async loadByConversationId(
    conversationId: number,
    limit = 50
  ): Promise<ChatMessage[]> {
    const result = await this.db
      .select({
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        sql`${messages.conversationId} = ${conversationId} AND ${messages.deletedAt} IS NULL`
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Reverse to get chronological order (oldest first)
    return result.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  async loadByUserId(userId: string, limit = 50): Promise<ChatMessage[]> {
    // Get conversation ID first
    const conv = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .get();

    if (!conv) return [];

    return this.loadByConversationId(conv.id, limit);
  }

  async saveBatch(
    conversationId: number,
    messageList: ChatMessage[]
  ): Promise<void> {
    if (messageList.length === 0) return;

    await this.db.insert(messages).values(
      messageList.map((msg) => ({
        conversationId,
        role: msg.role,
        content: msg.content,
        tokensUsed: msg.tokensUsed,
      }))
    );
  }

  async save(conversationId: number, message: ChatMessage): Promise<number> {
    const result = await this.db
      .insert(messages)
      .values({
        conversationId,
        role: message.role,
        content: message.content,
        tokensUsed: message.tokensUsed,
      })
      .returning({ id: messages.id });

    return result[0].id;
  }

  async softDeleteByConversationId(conversationId: number): Promise<void> {
    await this.db
      .update(messages)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        sql`${messages.conversationId} = ${conversationId} AND ${messages.deletedAt} IS NULL`
      );
  }

  async softDeleteByUserId(userId: string): Promise<void> {
    const conv = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .get();

    if (!conv) return;

    await this.softDeleteByConversationId(conv.id);
  }

  async countByConversationId(conversationId: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        sql`${messages.conversationId} = ${conversationId} AND ${messages.deletedAt} IS NULL`
      )
      .get();

    return result?.count ?? 0;
  }
}
