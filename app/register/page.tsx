import { getLanguage } from '../../lib/locale';
import { categories, categoryLabel } from '../../lib/report-categories';
import { getPublicReports, getWards } from '../../lib/report-store';

export const dynamic = 'force-dynamic';

const statuses = { SUBMITTED: 'Submitted', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' } as const;

export default async function Register({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const hi = await getLanguage() === 'hi';
  const params = await searchParams;
  const field = (name: string, max: number) => typeof params[name] === 'string' ? params[name].slice(0, max) : '';
  const q = field('q', 200);
  const ward = field('ward', 10);
  const status = field('status', 20);
  const view = field('view', 12);
  const sort = field('sort', 10) === 'affected' ? 'affected' : 'recent';
  const category = field('category', 20);
  const [wards, results] = await Promise.all([getWards(), getPublicReports(q, ward, status, category, field('before', 24), sort, view)]);
  const reports = results.slice(0, 50);
  const next = reports.at(-1)?.ticket_code;

  return <main id="main" className="content screen-register">
    <h1>{hi ? 'सार्वजनिक रजिस्टर' : 'Public register'}</h1>
    <nav className="home-links" aria-label="Quick report filters">
      {Object.entries({ '': 'All reports', overdue: 'Overdue', forwarded: 'Forwarded', evidence: 'Photo evidence' })
        .map(([key, label]) => <a key={key} aria-current={view === key ? 'page' : undefined}
          href={`/register?${new URLSearchParams({ q, ward, category, sort, ...(key === 'evidence' || key === 'overdue' ? {} : { status }), view: key })}`}>{label}</a>)}
    </nav>
    <form className="report-form">
      <input type="hidden" name="view" value={view} />
      <label>{hi ? 'खोजें' : 'Search'}<input name="q" defaultValue={q} placeholder={hi ? "शब्द या रिपोर्ट आईडी" : "Keyword or ticket ID"} /></label>
      <label>{hi ? 'वार्ड' : 'Ward'}<select name="ward" defaultValue={ward}><option value="">{hi ? 'सभी वार्ड' : 'All wards'}</option>
        {wards.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>{hi ? 'श्रेणी' : 'Category'}<select name="category" defaultValue={category}><option value="">{hi ? 'सभी श्रेणियाँ' : 'All categories'}</option>
        {categories.map(item =>
          <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label>
      <label>{hi ? 'स्थिति' : 'Status'}<select name="status" defaultValue={status}><option value="">{hi ? 'सभी स्थितियाँ' : 'All statuses'}</option>
        {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>{hi ? 'क्रम' : 'Sort'}<select name="sort" defaultValue={sort}><option value="recent">{hi ? 'सबसे नई' : 'Newest'}</option><option value="affected">{hi ? 'सबसे अधिक प्रभावित' : 'Most affected'}</option></select></label>
      <button>{hi ? 'फ़िल्टर लगाएँ' : 'Apply filters'}</button>
    </form>
    <h2>Reports</h2>
    {reports.length ? <ul className="register-list">{reports.map(report => <li key={report.ticket_code}>
      <strong><a href={`/register/${report.ticket_code}`}>{report.ticket_code}</a></strong> · {report.ward} · {statuses[report.status as keyof typeof statuses]}
      {report.due_on && <p>Due <time dateTime={report.due_on}>{report.due_on}</time>{report.overdue && ' · Overdue'}</p>}
      <p>{report.supporters} supporting</p>
      <p>{report.category} — {report.description}</p>
    </li>)}</ul> : <p>{hi ? 'इन फ़िल्टरों से कोई स्वीकृत रिपोर्ट नहीं मिली।' : 'No approved reports match these filters.'}</p>}
    {results.length > 50 && next && <a href={`/register?${new URLSearchParams({ q, ward, status, category, sort, view, before: next })}`}>{hi ? 'अगला पृष्ठ' : 'Next page'}</a>}
  </main>;
}
