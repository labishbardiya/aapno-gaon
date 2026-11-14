import { notFound } from 'next/navigation';
import { readPool } from '../../../lib/report-store';
import { categoryLabel } from '../../../lib/report-categories';

export const dynamic = 'force-dynamic';

export default async function ReportDetail({ params }: { params: Promise<{ ticket: string }> }) {
  const { ticket } = await params;
  if (!/^MS-[A-F0-9]{18}$/.test(ticket)) notFound();
  const { rows: [report] } = await readPool().query<{
    ticket_code: string; ward: string; category: string; description: string; status: string; due_on: string | null;
    supporters: number; history: { type: string; note: string | null; date: string }[];
  }>(`
    select r.ticket_code, w.name as ward, r.category, r.description, r.status, r.due_on::text,
      (select count(*)::int from mysociety.report_support where report_id = r.id) as supporters,
      coalesce((select json_agg(json_build_object('type', e.event_type,
        'note', case when e.event_type = 'RESOLVE' then e.note end,
        'date', (e.created_at at time zone 'Asia/Kolkata')::date::text) order by e.id)
        from mysociety.report_events e where e.report_id = r.id
        and e.event_type in ('REPORT_CREATED', 'APPROVE', 'START', 'FORWARDED', 'DEADLINE', 'RESOLVE')), '[]'::json) as history
    from mysociety.reports r join mysociety.wards w on w.id = r.ward_id
    where r.ticket_code = $1 and r.visibility = 'APPROVED'
  `, [ticket]);
  if (!report) notFound();
  const labels: Record<string, string> = {
    REPORT_CREATED: 'Submitted', APPROVE: 'Published', START: 'Work started', FORWARDED: 'Forwarded',
    DEADLINE: 'Deadline updated', RESOLVE: 'Resolved',
  };
  return <main className="content"><a href="/register">Public register</a>
    <h1>{categoryLabel(report.category)} in {report.ward}</h1>
    <p>{report.ticket_code} · {categoryLabel(report.status.toLowerCase().replaceAll('_', '-'))}</p>
    <p>{report.description}</p><p>{report.supporters} supporting</p>
    {report.due_on && <p>Expected completion: <time dateTime={report.due_on}>{report.due_on}</time></p>}
    <h2>Updates</h2>
    <ol>{report.history.map((event, index) => <li key={index}><time dateTime={event.date}>{event.date}</time> · {labels[event.type]}
      {event.note && <p>{event.note}</p>}</li>)}</ol>
  </main>;
}
