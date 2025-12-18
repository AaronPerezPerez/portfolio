/**
 * D1ConversationRepository
 * Drizzle/D1 implementation of conversation persistence
 */

import {
  createDb,
  conversations,
  messages,
  eq,
  isNull,
  desc,
  asc,
  and,
  sql,
  type DrizzleDb,
} from '../../db';
import { Conversation, Message } from '../../domain/chat';
import type {
  IConversationRepository,
  ConversationWithStats,
  GlobalStats,
  ConversationListResult,
  ConversationFilters,
} from './IConversationRepository';

export class D1ConversationRepository implements IConversationRepository {
  private db: DrizzleDb;

  constructor(d1: D1Database) {
    this.db = createDb(d1);
  }

  async findByUserId(userId: string): Promise<Conversation | null> {
    const result = await this.db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .get();

    if (!result) return null;

    // Load messages for this conversation
    const messageList = await this.loadMessagesForConversation(result.id);

    const conversation = Conversation.fromPersistence({
      id: result.id,
      userId: result.userId,
      createdAt: result.createdAt ?? new Date().toISOString(),
      updatedAt: result.updatedAt ?? new Date().toISOString(),
    });

    conversation.setMessages(messageList);
    return conversation;
  }

  async findById(id: number): Promise<Conversation | null> {
    const result = await this.db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.id, id))
      .get();

    if (!result) return null;

    const messageList = await this.loadMessagesForConversation(id);

    const conversation = Conversation.fromPersistence({
      id: result.id,
      userId: result.userId,
      createdAt: result.createdAt ?? new Date().toISOString(),
      updatedAt: result.updatedAt ?? new Date().toISOString(),
    });

    conversation.setMessages(messageList);
    return conversation;
  }

  async getOrCreate(userId: string): Promise<number> {
    const existing = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .get();

    if (existing) {
      await this.db
        .update(conversations)
        .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(conversations.id, existing.id));
      return existing.id;
    }

    const result = await this.db
      .insert(conversations)
      .values({ userId })
      .returning({ id: conversations.id });

    return result[0].id;
  }

  async save(conversation: Conversation): Promise<void> {
    const dto = conversation.toDTO();

    if (dto.id) {
      // Update existing
      await this.db
        .update(conversations)
        .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(conversations.id, dto.id));
    } else {
      // Create new
      await this.db.insert(conversations).values({
        userId: dto.userId,
      });
    }
  }

  async listWithStats(limit = 100): Promise<ConversationListResult> {
    // Get conversations with stats using raw SQL for complex subquery
    const conversationsResult = await this.db.all<{
      id: number;
      user_id: string;
      created_at: string | null;
      message_count: number;
      last_message_at: string | null;
      last_message: string | null;
    }>(sql`
      SELECT
        c.id,
        c.user_id,
        c.created_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at,
        (SELECT content FROM messages
         WHERE conversation_id = c.id AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY last_message_at DESC
      LIMIT ${limit}
    `);

    // Get global stats (excluding deleted conversations)
    const statsResult = await this.db.get<{
      total_conversations: number;
      total_messages: number;
      messages_today: number;
    }>(sql`
      SELECT
        (SELECT COUNT(*) FROM conversations WHERE deleted_at IS NULL) as total_conversations,
        (SELECT COUNT(*) FROM messages m
         INNER JOIN conversations c ON m.conversation_id = c.id
         WHERE m.deleted_at IS NULL AND c.deleted_at IS NULL) as total_messages,
        (SELECT COUNT(*) FROM messages m
         INNER JOIN conversations c ON m.conversation_id = c.id
         WHERE m.deleted_at IS NULL AND c.deleted_at IS NULL
         AND m.created_at > datetime('now', '-1 day')) as messages_today
    `);

    return {
      conversations: conversationsResult.map((c) => ({
        id: c.id,
        userId: c.user_id,
        createdAt: c.created_at,
        updatedAt: null,
        messageCount: c.message_count,
        lastMessageAt: c.last_message_at,
        lastMessage: c.last_message,
      })),
      stats: {
        totalConversations: statsResult?.total_conversations ?? 0,
        totalMessages: statsResult?.total_messages ?? 0,
        messagesToday: statsResult?.messages_today ?? 0,
      },
    };
  }

  async listWithFilters(filters: ConversationFilters): Promise<ConversationListResult> {
    const limit = filters.limit ?? 100;

    // Build WHERE conditions dynamically
    // Always exclude deleted conversations
    const conditions: string[] = ['c.deleted_at IS NULL'];

    if (filters.dateFrom) {
      conditions.push(`c.created_at >= '${filters.dateFrom}'`);
    }

    if (filters.dateTo) {
      conditions.push(`c.created_at <= '${filters.dateTo}'`);
    }

    // Language filter: check if conversation has messages with detected language
    // This is a simplified approach - in production you might want a separate language column
    if (filters.language) {
      const langPatterns: Record<string, string[]> = {
        es: ['¿', '¡', 'qué', 'cómo', 'español', 'hola', 'gracias'],
        en: ['what', 'how', 'hello', 'thanks', 'please', 'would'],
      };

      const patterns = langPatterns[filters.language];
      if (patterns && patterns.length > 0) {
        const langConditions = patterns
          .map((p) => `LOWER(m.content) LIKE '%${p.toLowerCase()}%'`)
          .join(' OR ');
        conditions.push(`(${langConditions})`);
      }
    }

    // Tag filter: join with conversation_tags
    let tagJoin = '';
    if (filters.hasTag !== undefined) {
      tagJoin = `INNER JOIN conversation_tags ct ON ct.conversation_id = c.id AND ct.tag_id = ${filters.hasTag}`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build HAVING clause for message count filters
    const havingConditions: string[] = [];

    if (filters.minMessages !== undefined) {
      havingConditions.push(`message_count >= ${filters.minMessages}`);
    }

    if (filters.maxMessages !== undefined) {
      havingConditions.push(`message_count <= ${filters.maxMessages}`);
    }

    const havingClause =
      havingConditions.length > 0 ? `HAVING ${havingConditions.join(' AND ')}` : '';

    // Execute filtered query
    const queryStr = `
      SELECT
        c.id,
        c.user_id,
        c.created_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at,
        (SELECT content FROM messages
         WHERE conversation_id = c.id AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      ${tagJoin}
      LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
      ORDER BY last_message_at DESC
      LIMIT ${limit}
    `;

    const conversationsResult = await this.db.all<{
      id: number;
      user_id: string;
      created_at: string | null;
      message_count: number;
      last_message_at: string | null;
      last_message: string | null;
    }>(sql.raw(queryStr));

    // Get filtered stats
    const countQueryStr = `
      SELECT
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages
      FROM conversations c
      ${tagJoin}
      LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
      ${whereClause}
    `;

    const statsResult = await this.db.get<{
      total_conversations: number;
      total_messages: number;
    }>(sql.raw(countQueryStr));

    // Get today's messages (unfiltered for comparison)
    const todayResult = await this.db.get<{ messages_today: number }>(sql`
      SELECT COUNT(*) as messages_today
      FROM messages
      WHERE deleted_at IS NULL AND created_at > datetime('now', '-1 day')
    `);

    return {
      conversations: conversationsResult.map((c) => ({
        id: c.id,
        userId: c.user_id,
        createdAt: c.created_at,
        updatedAt: null,
        messageCount: c.message_count,
        lastMessageAt: c.last_message_at,
        lastMessage: c.last_message,
      })),
      stats: {
        totalConversations: statsResult?.total_conversations ?? 0,
        totalMessages: statsResult?.total_messages ?? 0,
        messagesToday: todayResult?.messages_today ?? 0,
      },
    };
  }

  async getDetail(id: number): Promise<{
    conversation: ConversationWithStats;
    messages: Array<{
      id: number;
      role: string;
      content: string;
      createdAt: string | null;
    }>;
  } | null> {
    const conv = await this.db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.id, id))
      .get();

    if (!conv) return null;

    const messageList = await this.db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(eq(messages.conversationId, id), isNull(messages.deletedAt)))
      .orderBy(asc(messages.createdAt))
      .all();

    // Get message count
    const countResult = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(and(eq(messages.conversationId, id), isNull(messages.deletedAt)))
      .get();

    return {
      conversation: {
        id: conv.id,
        userId: conv.userId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: countResult?.count ?? 0,
        lastMessageAt: messageList[messageList.length - 1]?.createdAt ?? null,
        lastMessage: messageList[messageList.length - 1]?.content ?? null,
      },
      messages: messageList.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async softDelete(id: number): Promise<void> {
    // Soft delete the conversation
    await this.db
      .update(conversations)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(conversations.id, id));

    // Soft delete all messages in the conversation
    await this.db
      .update(messages)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        sql`${messages.conversationId} = ${id} AND ${messages.deletedAt} IS NULL`
      );
  }

  async restore(id: number): Promise<void> {
    // Restore the conversation
    await this.db
      .update(conversations)
      .set({ deletedAt: null })
      .where(eq(conversations.id, id));

    // Restore all messages in the conversation
    await this.db
      .update(messages)
      .set({ deletedAt: null })
      .where(eq(messages.conversationId, id));
  }

  async permanentDelete(id: number): Promise<void> {
    // Delete all conversation tags
    await this.db.all(sql`DELETE FROM conversation_tags WHERE conversation_id = ${id}`);

    // Delete all messages
    await this.db.all(sql`DELETE FROM messages WHERE conversation_id = ${id}`);

    // Delete the conversation
    await this.db.delete(conversations).where(eq(conversations.id, id));
  }

  async listDeleted(limit = 100): Promise<ConversationWithStats[]> {
    const result = await this.db.all<{
      id: number;
      user_id: string;
      created_at: string | null;
      deleted_at: string | null;
      message_count: number;
      last_message_at: string | null;
      last_message: string | null;
    }>(sql`
      SELECT
        c.id,
        c.user_id,
        c.created_at,
        c.deleted_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at,
        (SELECT content FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.deleted_at IS NOT NULL
      GROUP BY c.id
      ORDER BY c.deleted_at DESC
      LIMIT ${limit}
    `);

    return result.map((c) => ({
      id: c.id,
      userId: c.user_id,
      createdAt: c.created_at,
      updatedAt: c.deleted_at, // Use deleted_at as updatedAt for trash view
      messageCount: c.message_count,
      lastMessageAt: c.last_message_at,
      lastMessage: c.last_message,
    }));
  }

  // Private helper methods
  private async loadMessagesForConversation(
    conversationId: number
  ): Promise<Message[]> {
    const result = await this.db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        createdAt: messages.createdAt,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .where(
        sql`${messages.conversationId} = ${conversationId} AND ${messages.deletedAt} IS NULL`
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);

    // Reverse to get chronological order and map to domain entities
    return result.reverse().map((m) =>
      Message.fromPersistence({
        id: m.id,
        conversationId,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt ?? new Date().toISOString(),
        deletedAt: m.deletedAt,
      })
    );
  }
}
