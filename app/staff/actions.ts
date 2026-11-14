'use server';

import sharp from 'sharp';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authRequest, getStaff, sessionCookie } from '../../lib/staff-auth';
import { readPool } from '../../lib/report-store';

export async function signIn(form: FormData) {
  const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) })
    .safeParse({ email: form.get('email'), password: form.get('password') });
  if (!input.success) redirect('/staff?error=login');
  const session = z.object({ access_token: z.string(), expires_in: z.number().int().positive(), user: z.object({ id: z.uuid() }) })
    .safeParse(await authRequest('token?grant_type=password', {
      method: 'POST', body: JSON.stringify(input.data),
    }).catch(() => null));
  if (!session.success) redirect('/staff?error=login');
  const { rowCount } = await readPool().query(
    'select 1 from mysociety.staff_members where user_id = $1', [session.data.user.id],
  );
  if (!rowCount) redirect('/staff?error=login');
  (await cookies()).set(sessionCookie, session.data.access_token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: session.data.expires_in,
  });
  redirect('/staff');
}

export async function signOut() {
  (await cookies()).delete(sessionCookie);
  redirect('/staff');
}

const change = z.object({
  id: z.uuid(), version: z.coerce.number().int().positive().max(2147483647),
  operation: z.enum(['approve', 'reject', 'start', 'resolve', 'deadline', 'claim']), note: z.string().trim().max(500), deadline: z.union([z.literal(''), z.iso.date()]),
});

export async function updateReport(form: FormData) {
  const staff = await getStaff();
  if (!staff) redirect('/staff');
  const input = change.safeParse(Object.fromEntries(["id", "version", "operation", "note", "deadline"].map(key => [key, form.get(key) ?? ""])));
  if (!input.success || (input.data.operation === 'resolve' && !input.data.note) || (input.data.operation === 'deadline' && !input.data.deadline)) {
    redirect('/staff?error=invalid');
  }
  const { id, version, operation, note, deadline } = input.data;
  const photo = form.get('resolutionPhoto');
  let evidence: Buffer | null = null;
  if (operation === 'resolve' && photo instanceof File && photo.size) {
    if (photo.size > 700000 || form.get('publishEvidence') !== 'on') redirect('/staff?queue=work&error=photo');
    try {
      const source = sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 24000000 });
      const { format } = await source.metadata();
      if (format && ['jpeg', 'png', 'webp'].includes(format)) {
        evidence = await source.rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 70 }).toBuffer();
      }
    } catch { evidence = null; }
    if (!evidence || evidence.length > 350000) redirect('/staff?queue=work&error=photo');
  }
  const db = readPool();
  const { rows: [schema] } = await db.query<{ evidence: string | null }>(
    "select to_regclass('mysociety.resolution_evidence')::text as evidence",
  );
  if (evidence && !schema.evidence) redirect('/staff?queue=work&error=photo');
  const { rowCount } = await db.query(
    `with eligible as (
       select id, status, visibility, due_on from mysociety.reports
       where id = $1 and version = $2
         and (assigned_staff_id is null or assigned_staff_id = $3)
         and exists (select 1 from mysociety.staff_members where user_id = $3)
         and case $4
           when 'claim' then assigned_staff_id is null and visibility <> 'REJECTED' and status <> 'RESOLVED'
           when 'approve' then visibility = 'PENDING_REVIEW'
           when 'reject' then visibility = 'PENDING_REVIEW'
           when 'start' then visibility = 'APPROVED' and status = 'SUBMITTED'
           when 'deadline' then assigned_staff_id = $3 and visibility = 'APPROVED' and status <> 'RESOLVED'
           when 'resolve' then visibility = 'APPROVED' and status = 'IN_PROGRESS'
         end
       for update
     ), changed as (
       update mysociety.reports r set
         status = case $4 when 'start' then 'IN_PROGRESS' when 'resolve' then 'RESOLVED' else e.status end,
         visibility = case $4 when 'approve' then 'APPROVED' when 'reject' then 'REJECTED' else e.visibility end,
         assigned_staff_id = case when $4 = 'claim' then $3 else r.assigned_staff_id end,
         resolved_at = case when $4 = 'resolve' then now() else r.resolved_at end,
         due_on = case when $4 = 'deadline' then $6::date else r.due_on end,
         version = r.version + 1, updated_at = now()
       from eligible e where r.id = e.id
       returning r.id, e.status as old_status, r.status, e.due_on as old_due_on, r.due_on
     )${schema.evidence ? `, evidence_saved as (
       insert into mysociety.resolution_evidence (report_id, image)
       select id, $7::bytea from changed where $7::bytea is not null
     )` : ''}
     insert into mysociety.report_events (report_id, actor_id, event_type, old_status, new_status, note)
     select id, $3, upper($4), old_status, status, case when $4 = 'resolve' then $5 when $4 = 'deadline' then coalesce(old_due_on::text, 'unset') || ' → ' || due_on::text end from changed`,
    [id, version, staff, operation, note, deadline || null, ...(schema.evidence ? [evidence] : [])],
  );
  redirect('/staff?' + new URLSearchParams({
    ...(operation === 'deadline' || operation === 'start' || operation === 'resolve' ? { queue: 'work' } : {}),
    ...(rowCount ? { saved: '1' } : { error: 'conflict' }),
  }));
}
