import { redirect } from 'next/navigation';
import { getAdmin } from '../../lib/staff-auth';
import { getWards, readPool } from '../../lib/report-store';
import { categories, categoryLabel } from '../../lib/report-categories';
import { saveRule, transferReport, reviewCommunity, publishDirectory } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; q?: string }> }) {
  if (!await getAdmin().catch(() => null)) redirect('/staff');
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 40) : '';
  const db = readPool();
  const [wards, { rows: staff }, { rows: rules }, { rows: reports }, { rows: audit }] = await Promise.all([
    getWards(),
    db.query<{ user_id: string }>('select user_id from mysociety.staff_members order by user_id'),
    db.query<{ name: string; category: string; staff_id: string }>(
      'select w.name, r.category, r.staff_id from mysociety.routing_rules r join mysociety.wards w on w.id = r.ward_id order by w.name, r.category',
    ),
    db.query<{ id: string; version: number; ticket_code: string; category: string; status: string; visibility: string; assigned_staff_id: string | null }>(
      `select id, version, ticket_code, category, status, visibility, assigned_staff_id
       from mysociety.reports where $1 = '' or ticket_code = upper($1) order by created_at desc limit 30`, [q],
    ),
    db.query<{ label: string; detail: string; happened: string }>(`
      select label, detail, happened::text from (
        select e.event_type as label, r.ticket_code as detail, e.created_at as happened
        from mysociety.report_events e join mysociety.reports r on r.id = e.report_id
        union all
        select 'ROUTING_RULE_SAVED', w.name || ' / ' || a.category, a.created_at
        from mysociety.routing_audit a join mysociety.wards w on w.id = a.ward_id
      ) history order by happened desc limit 30`),
  ]);
  const community = await db.query<{ id: string; kind: string; ward: string; detail: string; phone: string; blood_group: string | null }>(
    `select r.id, r.kind, w.name as ward, r.detail, r.phone, r.blood_group
     from mysociety.community_requests r join mysociety.wards w on w.id = r.ward_id
     where r.reviewed_at is null order by r.created_at limit 30`,
  ).catch((error: { code?: string }) => {
    if (error.code === "42P01") return { rows: [] };
    throw error;
  });
  const staffOptions = staff.map(member => <option key={member.user_id} value={member.user_id}>{member.user_id}</option>);
  return <main className="content">
    <nav className="home-links"><a href="/staff">Staff queue</a><a href="/overview?scope=staff">Internal overview</a></nav>
    <h1>Administration</h1>
    {params.saved && <p role="status">Change saved.</p>}
    {params.error && <p role="alert">Could not save the change. Check the selection and try again.</p>}
    <h2>Routing rules</h2>
    <form className="report-form" action={saveRule}>
      <label>Ward<select name="ward" required>{wards.map(ward => <option value={ward.id} key={ward.id}>{ward.name}</option>)}</select></label>
      <label>Category<select name="category" required>{categories.map(category => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></label>
      <label>Assigned staff UID<select name="staff" required>{staffOptions}</select></label>
      <button>Save routing rule</button>
    </form>
    <ul className="register-list">{rules.map(rule => <li key={rule.name + ':' + rule.category}>{rule.name} · {categoryLabel(rule.category)} · {rule.staff_id}</li>)}</ul>
    <h2>Reports</h2>
    <form className="report-form"><label>Ticket ID<input name="q" defaultValue={q} /></label><button>Find report</button></form>
    {!reports.length && <p>No matching reports.</p>}
    <ul className="register-list">{reports.map(report => <li key={report.id}>
      <strong>{report.ticket_code}</strong> · {categoryLabel(report.category)} · {report.status} · {report.visibility}
      {report.visibility !== 'REJECTED' && report.status !== 'RESOLVED' && <form className="report-form" action={transferReport}>
        <input type="hidden" name="id" value={report.id} /><input type="hidden" name="version" value={report.version} />
        <label>Transfer to staff UID<select name="staff" defaultValue={report.assigned_staff_id ?? ''} required>
          <option value="" disabled>Select staff</option>{staffOptions}
        </select></label><button>Transfer report</button>
      </form>}
    </li>)}</ul>
    <h2>Community submissions</h2>
    {!community.rows.length && <p>No submissions awaiting review.</p>}
    <ul className="register-list">{community.rows.map(item => <li key={item.id}>
      <strong>{item.kind} · {item.ward}{item.blood_group && ' · ' + item.blood_group}</strong>
      <p>{item.detail}</p><p><a href={`tel:${item.phone}`}>{item.phone}</a></p>
      <form action={reviewCommunity}><input type="hidden" name="id" value={item.id} /><button>{item.kind === 'lost' || item.kind === 'found' ? 'Approve and publish listing' : 'Mark reviewed'}</button></form>
    </li>)}</ul>
    <h2>Publish a directory entry</h2>
    <form className="report-form" action={publishDirectory}>
      <label>Section<select name="section"><option value="notice">Notice</option><option value="guide">Guide</option><option value="contact">Contact</option></select></label>
      <label>Title<input name="title" maxLength={120} required /></label>
      <label>Details<textarea name="detail" maxLength={2000} required /></label>
      <button>Publish entry</button>
    </form>
    <h2>Recent activity</h2>
    <ul className="register-list">{audit.map((event, index) => <li key={index}>{event.label.replaceAll('_', ' ').toLowerCase()} · {event.detail} · {new Date(event.happened).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>)}</ul>
  </main>;
}
