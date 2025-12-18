import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../lib/admin-auth';
import { createDb, sql } from '../../../db';

export const prerender = false;

// GET /api/admin/live
// Server-Sent Events endpoint for live user activity
export async function GET(context: APIContext) {
  // Check authentication
  const authenticated = await isAuthenticated(context);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const d1 = context.locals.runtime?.env?.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ error: 'Database not available' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const db = createDb(d1);
  const encoder = new TextEncoder();

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const cleanup = (intervalId: ReturnType<typeof setInterval>, timeoutId: ReturnType<typeof setTimeout>) => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        try {
          controller.close();
        } catch {
          // Controller already closed
        }
      };

      const sendUpdate = async () => {
        if (isClosed) return;

        try {
          // Get users with activity in last 5 minutes
          const activeUsers = await db.all(sql`
            SELECT
              c.id as conversation_id,
              c.user_id,
              MAX(m.created_at) as last_activity
            FROM conversations c
            INNER JOIN messages m ON m.conversation_id = c.id
            WHERE m.created_at > datetime('now', '-5 minutes')
              AND m.deleted_at IS NULL
            GROUP BY c.id
            ORDER BY last_activity DESC
          `);

          const data = JSON.stringify({
            count: activeUsers.length,
            users: activeUsers.map((u: any) => ({
              id: u.user_id.substring(0, 8),
              lastActivity: u.last_activity
            }))
          });

          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          // Stream closed by client - silently ignore
          if ((error as any)?.code === 'ERR_INVALID_STATE') {
            isClosed = true;
            return;
          }
          console.error('[SSE Error]:', error);
        }
      };

      // Send initial data
      await sendUpdate();

      // Send updates every 10 seconds
      const intervalId = setInterval(sendUpdate, 10000);

      // Close after 5 minutes to prevent zombie connections
      const timeoutId = setTimeout(() => cleanup(intervalId, timeoutId), 5 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For nginx proxy
    }
  });
}
