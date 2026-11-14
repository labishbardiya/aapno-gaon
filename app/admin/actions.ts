'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAdmin } from '../../lib/staff-auth';
import { readPool } from '../../lib/report-store';
import { categories } from '../../lib/report-categories';

export async function saveRule(form: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect('/staff');
  const input = z.object({
    ward: z.coerce.number().int().positive().max(2147483647),
    category: z.enum(categories),
    staff: z.uuid(),
  }).safeParse({ ward: form.get('ward'), category: form.get('category'), staff: form.get('staff') });
  if (!input.success) redirect('/admin?error=1');
  const { ward, category, staff } = input.data;
  const result = await readPool().query(`
    with saved as (
      insert into mysociety.routing_rules (ward_id, category, staff_id)
      select w.id, $2, s.user_id from mysociety.wards w cross join mysociety.staff_members s
      where w.id = $1 and w.active and s.user_id = $3
        and exists (select 1 from mysociety.staff_members where user_id = $4 and is_admin)
      on conflict (ward_id, category) do update set staff_id = excluded.staff_id
      returning ward_id, category, staff_id
    )
    insert into mysociety.routing_audit (actor_id, ward_id, category, staff_id)
    select $4, ward_id, category, staff_id from saved
  `, [ward, category, staff, admin]);
  redirect(result.rowCount ? '/admin?saved=1' : '/admin?error=1');
}

export async function transferReport(form: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect('/staff');
  const input = z.object({
    id: z.uuid(), staff: z.uuid(), version: z.coerce.number().int().positive().max(2147483647),
  }).safeParse({ id: form.get('id'), staff: form.get('staff'), version: form.get('version') });
  if (!input.success) redirect('/admin?error=1');
  const { id, staff, version } = input.data;
  const result = await readPool().query(`
    with changed as (
      update mysociety.reports set assigned_staff_id = $2, version = version + 1, updated_at = now()
      where id = $1 and version = $3 and visibility <> 'REJECTED' and status <> 'RESOLVED'
        and assigned_staff_id is distinct from $2
        and exists (select 1 from mysociety.staff_members where user_id = $2)
        and exists (select 1 from mysociety.staff_members where user_id = $4 and is_admin)
      returning id, status
    )
    insert into mysociety.report_events (report_id, actor_id, event_type, new_status, note)
    select id, $4, 'FORWARDED', status, $2::uuid::text from changed
  `, [id, staff, version, admin]);
  redirect(result.rowCount ? '/admin?saved=1' : '/admin?error=1');
}
