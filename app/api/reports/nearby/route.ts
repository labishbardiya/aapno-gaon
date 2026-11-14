import { z } from 'zod';
import { categories } from '../../../../lib/report-categories';
import { readPool } from '../../../../lib/report-store';
import { reporterKey } from '../../../../lib/reporter';

const lookup = z.object({
  ward: z.coerce.number().int().positive().max(2147483647),
  category: z.enum(categories),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
}).refine(input => (input.lat === undefined) === (input.lng === undefined));

export async function GET(request: Request) {
  const input = lookup.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return Response.json({ error: 'INVALID_FILTERS' }, { status: 400 });
  const { ward, category, lat, lng } = input.data;
  const radius = category === 'streetlights' ? 60 : 400;
  try {
    const { rows } = await readPool().query(
      `select r.ticket_code, left(r.description, 160) as summary, r.status,
        (select count(*)::int from mysociety.report_support s where s.report_id = r.id) as supporters
       from mysociety.reports r
       where ward_id = $1 and category = $2 and visibility = 'APPROVED' and status <> 'RESOLVED'
         and ($3::float8 is null or r.latitude is null or
           12742000 * asin(sqrt(least(1,
             sin(radians(r.latitude - $3) / 2)^2 +
             cos(radians($3)) * cos(radians(r.latitude)) * sin(radians(r.longitude - $4::float8) / 2)^2
           ))) <= $5)
       order by (r.latitude is null), r.created_at desc limit 5`,
      [ward, category, lat ?? null, lng ?? null, radius],
    );
    return Response.json({ reports: rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'LOOKUP_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const ticket = z.string().regex(/^MS-[A-F0-9]{18}$/).safeParse(new URL(request.url).searchParams.get('ticket'));
  if (!ticket.success) return Response.json({ error: 'INVALID_TICKET' }, { status: 400 });
  try {
    const { rows } = await readPool().query(
      `with target as (
         select id from mysociety.reports
         where ticket_code = $1 and visibility = 'APPROVED' and status <> 'RESOLVED' for share
       ), supported as (
         insert into mysociety.report_support (report_id, reporter_key)
         select id, $2 from target on conflict do nothing
       ) select id from target`, [ticket.data, reporterKey(request).reporter],
    );
    return rows.length ? new Response(null, { status: 204 }) :
      Response.json({ error: 'REPORT_UNAVAILABLE' }, { status: 404 });
  } catch {
    return Response.json({ error: 'SUPPORT_UNAVAILABLE' }, { status: 503 });
  }
}
