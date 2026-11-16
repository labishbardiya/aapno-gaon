import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let pool: Pool | undefined;

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Database is not configured');
    if (!pool) {
      pool = new Pool({
        connectionString,
        max: 1,
        connectionTimeoutMillis: 750,
        query_timeout: 750,
        idleTimeoutMillis: 5000,
      });
      pool.on('error', () => { /* The next probe reconnects. */ });
    }
    await pool.query('select 1');
    return Response.json({ status: 'ready' }, { headers });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers });
  }
}
