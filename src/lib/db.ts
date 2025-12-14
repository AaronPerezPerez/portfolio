import type { D1Database } from '@cloudflare/workers-types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Obtener o crear conversación
export async function getOrCreateConversation(db: D1Database, userId: string): Promise<number> {
  const existing = await db.prepare(
    'SELECT id FROM conversations WHERE user_id = ?'
  ).bind(userId).first<{ id: number }>();

  if (existing) {
    await db.prepare(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(existing.id).run();
    return existing.id;
  }

  const result = await db.prepare(
    'INSERT INTO conversations (user_id) VALUES (?)'
  ).bind(userId).run();

  return result.meta.last_row_id as number;
}

// Guardar mensaje
export async function saveMessage(
  db: D1Database,
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  await db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).bind(conversationId, role, content).run();
}

// Cargar historial (últimos 50 mensajes, excluyendo borrados)
export async function loadMessages(db: D1Database, userId: string): Promise<Message[]> {
  const result = await db.prepare(`
    SELECT m.role, m.content
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = ? AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT 50
  `).bind(userId).all<{ role: 'user' | 'assistant'; content: string }>();

  return result.results.reverse();
}

// Limpiar conversación (soft delete)
export async function clearConversation(db: D1Database, userId: string): Promise<void> {
  await db.prepare(`
    UPDATE messages SET deleted_at = CURRENT_TIMESTAMP
    WHERE conversation_id IN (
      SELECT id FROM conversations WHERE user_id = ?
    ) AND deleted_at IS NULL
  `).bind(userId).run();
}
