import { getStaff } from '../../lib/staff-auth';
import { readPool } from '../../lib/report-store';
import { signIn, signOut, updateReport } from './actions';

export const dynamic = 'force-dynamic';

type Report = {
  id: string; version: number; ticket_code: string; ward: string; landmark: string;
  description: string; category: string; status: string; visibility: string;
  callback_name: string | null; callback_phone: string | null;
  latitude: number | null; longitude: number | null; resolution_note: string | null; due_on: string | null; overdue: boolean; assigned_to_me: boolean | null;
};

export default async function StaffPage({ searchParams }: {
  searchParams: Promise<{ queue?: string; error?: string; saved?: string; page?: string }>;
}) {
  const { queue, error, saved, page } = await searchParams;
  const staff = await getStaff().catch(() => null);
  if (!staff) return <main className="content"><a href="/">mySociety</a><h1>Staff sign-in</h1>
    {error && <p role="alert">Could not sign in. Check your account or contact the administrator.</p>}
    <form action={signIn} className="report-form">
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button>Sign in</button>
    </form>
  </main>;

  const filter = queue === 'work' || queue === 'closed' ? queue : 'review';
  const offset = /^\d{1,5}$/.test(page ?? '') ? Number(page) * 30 : 0;
  const { rows } = await readPool().query<Report>(
    `select r.id, r.version, r.ticket_code, w.name as ward, r.landmark, r.description,
       r.category, r.status, r.visibility, r.latitude, r.longitude, r.due_on::text,
       r.assigned_staff_id = $3 as assigned_to_me,
       case when r.assigned_staff_id = $3 then r.callback_name end as callback_name,
       case when r.assigned_staff_id = $3 then r.callback_phone end as callback_phone,
       r.status <> 'RESOLVED' and r.due_on < (now() at time zone 'Asia/Kolkata')::date as overdue,
       (select note from mysociety.report_events e where e.report_id = r.id and e.event_type = 'RESOLVE'
        order by e.id desc limit 1) as resolution_note
     from mysociety.reports r join mysociety.wards w on r.ward_id = w.id
     where (r.assigned_staff_id is null or r.assigned_staff_id = $3) and case $1 when 'work' then r.visibility = 'APPROVED' and r.status <> 'RESOLVED'
       when 'closed' then r.visibility = 'REJECTED' or r.status = 'RESOLVED'
       else r.visibility = 'PENDING_REVIEW' end
     order by r.created_at, r.id limit 31 offset $2`, [filter, offset, staff],
  );
  return <main className="content"><a href="/">mySociety</a><h1>Review submissions</h1>
    <nav className="home-links" aria-label="Staff views">
      <a href="/staff" aria-current={filter === 'review' ? 'page' : undefined}>Awaiting review</a>
      <a href="/staff?queue=work" aria-current={filter === 'work' ? 'page' : undefined}>Active reports</a>
      <a href="/staff?queue=closed" aria-current={filter === 'closed' ? 'page' : undefined}>Closed reports</a>
      <a href="/overview?scope=staff">Internal overview</a>
    </nav>
    <form action={signOut}><button>Sign out</button></form>
    {saved && <p role="status">Report updated.</p>}
    {error && <p role="alert">{error === 'conflict' ? 'The report changed. Review it again before updating.' : 'Check the resolution note and try again.'}</p>}
    {!rows.length && <p>There are no reports in this queue.</p>}
    <ul className="register-list">{rows.slice(0, 30).map(report => <li key={report.id}>
      <details>
        <summary><strong>{report.ticket_code}</strong> · {report.ward} · {report.category} · {report.visibility === 'REJECTED' ? 'Rejected' : report.status.replaceAll('_', ' ').toLowerCase()}</summary>
        <p>{report.assigned_to_me ? 'Assigned to you' : 'Unassigned'}</p>
        {report.due_on && <p>Due: {report.due_on}{report.overdue ? ' · Overdue' : ''}</p>}
        {report.callback_phone && <p>Private callback: {report.callback_name} <a href={`tel:${report.callback_phone}`}>{report.callback_phone}</a></p>}
        <p>{report.landmark}</p><p>{report.description}</p>
        {report.latitude !== null && <p>Issue location: {report.latitude}, {report.longitude}</p>}
        {report.resolution_note && <p>Resolution: {report.resolution_note}</p>}
        {filter !== 'closed' && !report.assigned_to_me && <form action={updateReport} className="report-form">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="version" value={report.version} />
          <button name="operation" value="claim">Assign to me</button>
        </form>}
        {filter === 'work' && report.assigned_to_me && <form action={updateReport} className="report-form">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="version" value={report.version} />
          <label>Expected completion date<input type="date" name="deadline" defaultValue={report.due_on ?? ''} required /></label>
          <button name="operation" value="deadline">Publish deadline</button>
        </form>}
        {filter !== 'closed' && <form action={updateReport} className="report-form">
          <input type="hidden" name="id" value={report.id} />
          <input type="hidden" name="version" value={report.version} />
          {filter === 'review' ? <div className="home-links">
            <button name="operation" value="approve">Approve for publication</button>
            <button name="operation" value="reject">Reject</button>
          </div> : report.status === 'SUBMITTED' ? <button name="operation" value="start">Start work</button> :
            <><label>Public resolution note<textarea name="note" required maxLength={500} /></label>
              <button name="operation" value="resolve">Mark resolved</button></>}
        </form>}
      </details>
    </li>)}</ul>
    <nav className="home-links" aria-label="Queue pages">
      {offset > 0 && <a href={`/staff?queue=${filter}&page=${offset / 30 - 1}`}>Previous page</a>}
      {rows.length > 30 && <a href={`/staff?queue=${filter}&page=${offset / 30 + 1}`}>Next page</a>}
    </nav>
  </main>;
}
