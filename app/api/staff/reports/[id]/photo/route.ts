import { z } from 'zod';
import { getStaff } from '../../../../../../lib/staff-auth';
import { readPool } from '../../../../../../lib/report-store';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  const staff = await getStaff().catch(() => null);
  if (!id.success || !staff) return new Response(null, { status: 404 });
  const { rows: [photo] } = await readPool().query<{ image: Buffer }>(
    `select p.image from mysociety.report_photos p join mysociety.reports r on r.id = p.report_id
     where r.id = $1 and (r.assigned_staff_id is null or r.assigned_staff_id = $2)`, [id.data, staff],
  );
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.image), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
