import { categories, categoryLabel } from '../../lib/report-categories';
import { getStaff } from '../../lib/staff-auth';
import { getOverviewRows } from '../../lib/overview-store';
export type { WardSummary } from '../../lib/overview-store';
import WardMap from './ward-map';

export default async function Overview({ searchParams }: {
  searchParams: Promise<{ days?: string; scope?: string; metric?: string; category?: string }>;
}) {
  const params = await searchParams;
  const internal = params.scope === 'staff' && Boolean(await getStaff().catch(() => null));
  const days = params.days === '7' || params.days === '90' ? Number(params.days) : 30;
  const metric = params.metric === 'received' || params.metric === 'rate' ? params.metric : 'pending';
  const category = categories.find(value => value === params.category) ?? '';
  const rows = await getOverviewRows(days, internal, category).catch(() => null);

  return <main id="main" className="content screen-overview"><h1>Village overview</h1>
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
    {rows ? <>
      <WardMap wards={rows} metric={metric} />
      <div className="overview-table"><table><caption>Reports received in the last {days} days</caption>
        <thead><tr><th scope="col">Village</th><th scope="col">Received</th><th scope="col">Pending</th><th scope="col">Resolved</th><th scope="col">Resolution rate</th><th scope="col">Overdue</th><th scope="col">Avg. days to resolve</th></tr></thead>
        <tbody>{rows.map(ward => <tr key={ward.name}><th scope="row">{ward.name}</th>
          <td>{ward.received}</td><td>{ward.pending}</td><td>{ward.resolved}</td>
          <td>{ward.received ? Math.round(100 * ward.resolved / ward.received) + '%' : 'No reports'}</td><td>{ward.overdue}</td><td>{ward.average_days ?? '—'}</td></tr>)}</tbody>
      </table></div>
    </> : <p role="status">Village totals are temporarily unavailable.</p>}
  </main>;
}
