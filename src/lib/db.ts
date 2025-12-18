import { createDb, conversations, messages, eq, isNull, desc, asc, sql } from '../db';
import type { DrizzleDb } from '../db';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Get or create conversation for a user
export async function getOrCreateConversation(db: DrizzleDb, userId: string): Promise<number> {
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .get();

  if (existing) {
    await db
      .update(conversations)
      .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(conversations.id, existing.id));
    return existing.id;
  }

  const result = await db
    .insert(conversations)
    .values({ userId })
    .returning({ id: conversations.id });

  return result[0].id;
}

// Save multiple messages in batch
export async function saveMessagesBatch(
  db: DrizzleDb,
  conversationId: number,
  messageList: ChatMessage[]
): Promise<void> {
  if (messageList.length === 0) return;

  await db.insert(messages).values(
    messageList.map(msg => ({
      conversationId,
      role: msg.role,
      content: msg.content,
    }))
  );
}

// Load message history (last 50 messages in chronological order)
export async function loadMessages(db: DrizzleDb, userId: string): Promise<ChatMessage[]> {
  // Get conversation ID first
  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .get();

  if (!conv) return [];

  // Get last 50 messages ordered by created_at DESC, then reverse
  const result = await db
    .select({
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      sql`${messages.conversationId} = ${conv.id} AND ${messages.deletedAt} IS NULL`
    )
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // Reverse to get chronological order (oldest first)
  return result.reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}

// Clear conversation (soft delete)
export async function clearConversation(db: DrizzleDb, userId: string): Promise<void> {
  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .get();

  if (!conv) return;

  await db
    .update(messages)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP` })
    .where(
      sql`${messages.conversationId} = ${conv.id} AND ${messages.deletedAt} IS NULL`
    );
}

// Helper to create DB instance from D1
export { createDb };
