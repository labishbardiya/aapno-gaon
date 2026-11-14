import { readPool } from './report-store';
import { categoryLabel } from './report-categories';

export async function publicRequests(filters: { ids?: string[]; categories?: string[]; status?: string; start?: string; end?: string }) {
  const { rows } = await readPool().query<{
    ticket_code: string; category: string; state: 'open' | 'closed'; ward: string;
    description: string; created_at: Date; updated_at: Date; due_on: string | null;
  }>(`
    select r.ticket_code, r.category, case when r.status = 'RESOLVED' then 'closed' else 'open' end as state,
      w.name as ward, r.description, r.created_at, r.updated_at, r.due_on::text
    from mysociety.reports r join mysociety.wards w on w.id = r.ward_id
    where r.visibility = 'APPROVED'
      and ($1::text[] is null or r.ticket_code = any($1))
      and ($2::text[] is null or r.category = any($2))
      and ($3::text is null or (r.status = 'RESOLVED') = ($3 = 'closed'))
      and ($4::timestamptz is null or r.created_at >= $4)
      and ($5::timestamptz is null or r.created_at <= $5)
    order by r.created_at desc, r.id desc limit 100
  `, [filters.ids ?? null, filters.categories ?? null, filters.status ?? null, filters.start ?? null, filters.end ?? null]);
  return rows.map(row => ({
    service_request_id: row.ticket_code, status: row.state, service_code: row.category,
    service_name: categoryLabel(row.category), description: row.description, address: row.ward,
    requested_datetime: row.created_at.toISOString(), updated_datetime: row.updated_at.toISOString(),
    expected_datetime: row.due_on ? row.due_on + 'T23:59:59+05:30' : null,
    lat: null, long: null, media_url: null,
  }));
}

export function open311Error(code: number, description: string) {
  return Response.json([{ code, description }], { status: code, headers: { 'Cache-Control': 'no-store' } });
}

export function open311Response(data: unknown) {
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
