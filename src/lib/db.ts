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

// Guardar múltiples mensajes en batch (más eficiente)
export async function saveMessagesBatch(
  db: D1Database,
  conversationId: number,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  if (messages.length === 0) return;

  const stmt = db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  );

  await db.batch(
    messages.map(msg => stmt.bind(conversationId, msg.role, msg.content))
  );
}

// Cargar historial (últimos 50 mensajes en orden cronológico)
export async function loadMessages(db: D1Database, userId: string): Promise<Message[]> {
  // Subconsulta: obtiene los últimos 50 (DESC), luego los reordena (ASC)
  const result = await db.prepare(`
    SELECT role, content FROM (
      SELECT m.role, m.content, m.created_at
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT 50
    ) ORDER BY created_at ASC
  `).bind(userId).all<{ role: 'user' | 'assistant'; content: string }>();

  return result.results;
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
