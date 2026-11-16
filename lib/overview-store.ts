import { unstable_cache } from 'next/cache';
import { readPool } from './report-store';

export type WardSummary = {
  name: string; latitude: number | null; longitude: number | null;
  overdue: number; average_days: number | null;
  received: number; pending: number; resolved: number;
};

async function queryOverview(days: number, internal: boolean, category: string) {
  const result = await readPool().query<WardSummary>(
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
  return queryPublicOverview(days, category);
}
