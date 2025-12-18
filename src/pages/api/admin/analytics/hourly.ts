import type { APIContext } from 'astro';
import { isAuthenticated } from '../../../../lib/admin-auth';
import { createDb, sql } from '../../../../db';

export const prerender = false;

// GET /api/admin/analytics/hourly
// Returns message count by hour of day (0-23)
export async function GET(context: APIContext) {
  const headers = { 'Content-Type': 'application/json' };

  const authenticated = await isAuthenticated(context);
  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers }
    );
  }

  const d1 = context.locals.runtime?.env?.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ error: 'Database not available' }),
      { status: 500, headers }
    );
  }

  try {
    const db = createDb(d1);

    // Get message count by hour
    const hourlyData = await db.all(sql`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as count
      FROM messages
      WHERE deleted_at IS NULL
      GROUP BY strftime('%H', created_at)
      ORDER BY hour ASC
    `);

    // Fill all 24 hours with 0 if missing
    const filledHourly = fillAllHours(hourlyData as { hour: number; count: number }[]);

    return new Response(
      JSON.stringify({ hourly: filledHourly }),
      { headers }
    );
  } catch (error) {
    console.error('[Analytics Hourly Error]:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch hourly data' }),
      { status: 500, headers }
    );
  }
}

// Fill all 24 hours (0-23) with counts
function fillAllHours(data: { hour: number; count: number }[]) {
  const hourMap = new Map(data.map(d => [d.hour, d.count]));
  const result: { hour: number; count: number }[] = [];

  for (let h = 0; h < 24; h++) {
    result.push({
      hour: h,
      count: hourMap.get(h) || 0
    });
  }

  return result;
}
