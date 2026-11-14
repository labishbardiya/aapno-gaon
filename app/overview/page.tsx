import { categories, categoryLabel } from '../../lib/report-categories';
import { getStaff } from '../../lib/staff-auth';
import { readPool } from '../../lib/report-store';
import WardMap from './ward-map';

export const dynamic = 'force-dynamic';

export type WardSummary = {
  name: string; latitude: number | null; longitude: number | null;
  received: number; pending: number; resolved: number;
};

export default async function Overview({ searchParams }: {
  searchParams: Promise<{ days?: string; scope?: string; metric?: string; category?: string }>;
}) {
  const params = await searchParams;
  const internal = params.scope === 'staff' && Boolean(await getStaff().catch(() => null));
  const days = params.days === '7' || params.days === '90' ? Number(params.days) : 30;
  const metric = params.metric === 'received' || params.metric === 'rate' ? params.metric : 'pending';
  const category = categories.some(value => value === params.category) ? params.category : '';
  const result = await readPool().query<WardSummary & { overdue: number; average_days: number | null }>(
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
  ).catch(() => null);

  return <main id="main" className="content screen-overview"><h1>Ward overview</h1>
    <p>{internal ? 'Internal view' : 'Approved public reports'} · Last {days} days</p>
    <form className="report-form">
      {internal && <input type="hidden" name="scope" value="staff" />}
      <label>Period<select name="days" defaultValue={days}>{[7, 30, 90].map(value =>
        <option key={value} value={value}>Last {value} days</option>)}</select></label>
      <label>Category<select name="category" defaultValue={category}><option value="">All categories</option>
        {categories.map(value => <option key={value} value={value}>{categoryLabel(value)}</option>)}</select></label>
      <label>Map metric<select name="metric" defaultValue={metric}><option value="pending">Pending volume</option>
        <option value="received">Received volume</option><option value="rate">Resolution rate</option></select></label>
      <button>Apply filters</button>
    </form>
    {result ? <>
      <WardMap wards={result.rows} metric={metric} />
      <div className="overview-table"><table><caption>Reports received in the last {days} days</caption>
        <thead><tr><th scope="col">Ward</th><th scope="col">Received</th><th scope="col">Pending</th><th scope="col">Resolved</th><th scope="col">Resolution rate</th><th scope="col">Overdue</th><th scope="col">Avg. days to resolve</th></tr></thead>
        <tbody>{result.rows.map(ward => <tr key={ward.name}><th scope="row">{ward.name}</th>
          <td>{ward.received}</td><td>{ward.pending}</td><td>{ward.resolved}</td>
          <td>{ward.received ? Math.round(100 * ward.resolved / ward.received) + '%' : 'No reports'}</td><td>{ward.overdue}</td><td>{ward.average_days ?? '—'}</td></tr>)}</tbody>
      </table></div>
    </> : <p role="status">Ward totals are temporarily unavailable.</p>}
  </main>;
}
