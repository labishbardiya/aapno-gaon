import { unstable_cache } from 'next/cache';
import { createClient } from 'redis';
import { Pool } from 'pg';
import { readPool } from './report-store';

export type WardSummary = {
  name: string; latitude: number | null; longitude: number | null;
  overdue: number; average_days: number | null;
  received: number; pending: number; resolved: number;
};

async function queryOverview(days: number, internal: boolean, category: string, pool = readPool()) {
  const result = await pool.query<WardSummary>(
    `select w.name, w.center_latitude as latitude, w.center_longitude as longitude,
       count(r.id)::int as received,
       count(r.id) filter (where r.status in ('SUBMITTED', 'IN_PROGRESS'))::int as pending,
       count(r.id) filter (where r.status = 'RESOLVED')::int as resolved,
       count(r.id) filter (where r.status <> 'RESOLVED' and r.due_on < (now() at time zone 'Asia/Kolkata')::date)::int as overdue,
       round(avg(extract(epoch from (r.resolved_at - r.created_at)) / 86400)
         filter (where r.status = 'RESOLVED'), 1)::float8 as average_days
     from mysociety.wards w left join mysociety.reports r on r.ward_id = w.id
       and r.created_at >= now() - make_interval(days => $1)
       and ($2 or r.visibility = 'APPROVED')
       and r.visibility <> 'REJECTED'
       and ($3 = '' or r.category = $3)
     group by w.id order by w.name`, [days, internal, category],
  );
  return result.rows;
}

const queryPublicOverview = unstable_cache(
  (days: number, category: string) => queryOverview(days, false, category),
  ['public-overview-totals-v1'],
  { revalidate: 30 },
);

export function getOverviewRows(days: number, internal: boolean, category: string) {
  if (internal || process.env.PUBLIC_OVERVIEW_CACHE === 'off') {
    return queryOverview(days, internal, category);
  }
  if (process.env.DEMO_REDIS_URL && process.env.DEMO_REPLICA_URL) {
    return getSharedOverview(days, category).then(result => result.rows);
  }
  return queryPublicOverview(days, category);
}

let sharedConnection: ReturnType<typeof connectSharedCache> | undefined;
let replicaPool: Pool | undefined;

export async function getSharedOverview(days: number, category: string) {
  const url = process.env.DEMO_REDIS_URL;
  const connectionString = process.env.DEMO_REPLICA_URL;
  if (!url || !connectionString) throw new Error('Shared demo services are not configured');
  const key = `public-overview:v1:${days}:${category}`;
  const cache = await (sharedConnection ??= connectSharedCache(url)).catch(() => null);
  const hit = await cache?.get(key).catch(() => null);
  if (hit) return { rows: JSON.parse(hit) as WardSummary[], cache: 'HIT', source: 'redis' };

  if (!replicaPool) {
    replicaPool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 2000, query_timeout: 2000 });
    replicaPool.on('error', onReplicaError);
  }
  const rows = await queryOverview(days, false, category, replicaPool);
  await cache?.set(key, JSON.stringify(rows), { EX: 30 }).catch(() => null);
  return { rows, cache: 'MISS', source: 'replica' };
}

function onReplicaError(error: Error) {
  console.error('Demo replica connection:', error.message);
}

function connectSharedCache(url: string) {
  const client = createClient({ url, disableOfflineQueue: true, socket: { connectTimeout: 1000, reconnectStrategy: false } });
  client.on('error', error => console.error('Demo Redis connection:', error.message));
  client.on('end', () => { sharedConnection = undefined; });
  return client.connect().then(() => client).catch(error => {
    sharedConnection = undefined;
    throw error;
  });
}
