import { categories, categoryLabel } from '../../lib/report-categories';
import { getPublicReports, getWards } from '../../lib/report-store';

export const dynamic = 'force-dynamic';

const statuses = { SUBMITTED: 'Submitted', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' } as const;

export default async function Register({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const field = (name: string, max: number) => typeof params[name] === 'string' ? params[name].slice(0, max) : '';
  const q = field('q', 200);
  const ward = field('ward', 10);
  const status = field('status', 20);
  const sort = field('sort', 10) === 'affected' ? 'affected' : 'recent';
  const category = field('category', 20);
  const [wards, results] = await Promise.all([getWards(), getPublicReports(q, ward, status, category, field('before', 24), sort)]);
  const reports = results.slice(0, 50);
  const next = reports.at(-1)?.ticket_code;

  return <main className="content">
    <a href="/">mySociety</a><h1>Public register</h1>
    <form className="report-form">
      <label>Search<input name="q" defaultValue={q} placeholder="Keyword or ticket ID" /></label>
      <label>Ward<select name="ward" defaultValue={ward}><option value="">All wards</option>
        {wards.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select name="category" defaultValue={category}><option value="">All categories</option>
        {categories.map(item =>
          <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
      <label>Status<select name="status" defaultValue={status}><option value="">All statuses</option>
        {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Sort<select name="sort" defaultValue={sort}><option value="recent">Newest</option><option value="affected">Most affected</option></select></label>
      <button>Apply filters</button>
    </form>
    <h2>Reports</h2>
    {reports.length ? <ul className="register-list">{reports.map(report => <li key={report.ticket_code}>
      <strong><a href={`/register/${report.ticket_code}`}>{report.ticket_code}</a></strong> · {report.ward} · {statuses[report.status as keyof typeof statuses]}
      {report.due_on && <p>Due <time dateTime={report.due_on}>{report.due_on}</time>{report.overdue && ' · Overdue'}</p>}
      <p>{report.supporters} supporting</p>
      <p>{report.category} — {report.description}</p>
    </li>)}</ul> : <p>No approved reports match these filters.</p>}
    {results.length > 50 && next && <a href={`/register?${new URLSearchParams({ q, ward, status, category, sort, before: next })}`}>Next page</a>}
  </main>;
}
