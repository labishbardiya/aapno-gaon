import { readPool } from '../../../../../../lib/report-store';

export async function GET(_request: Request, { params }: { params: Promise<{ ticket: string; kind: string }> }) {
  const { ticket, kind } = await params;
  if (!/^MS-[A-F0-9]{18}$/.test(ticket) || !['before', 'after'].includes(kind)) {
    return new Response(null, { status: 404 });
  }
  const db = readPool();
  const { rows: [schema] } = await db.query<{ evidence: string | null }>(
    "select to_regclass('mysociety.resolution_evidence')::text as evidence",
  );
  if (!schema.evidence) return new Response(null, { status: 404 });
  const { rows: [photo] } = await db.query<{ image: Buffer | null }>(
    `select case when $2 = 'before' then p.image else e.image end as image
     from mysociety.reports r join mysociety.resolution_evidence e on e.report_id = r.id
     left join mysociety.report_photos p on p.report_id = r.id
     where r.ticket_code = $1 and r.visibility = 'APPROVED' and r.status = 'RESOLVED'`, [ticket, kind],
  );
  if (!photo?.image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.image), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
