'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { readPool } from '../../lib/report-store';

export async function submitCommunity(form: FormData) {
  const lang = form.get('lang') === 'hi' ? 'hi' : 'en';
  const result = z.object({
    kind: z.enum(['lost', 'found', 'blood-request', 'donor']),
    ward: z.coerce.number().int().positive().max(2147483647),
    detail: z.string().trim().min(1).max(1000),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/),
    blood: z.union([z.literal(''), z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])]),
    consent: z.literal('on'),
  }).safeParse(Object.fromEntries(form));
  if (!result.success) redirect(`/services?lang=${lang}&error=1`);
  const { kind, ward, detail, phone, blood } = result.data;
  if (Boolean(blood) !== (kind === 'blood-request' || kind === 'donor')) redirect(`/services?lang=${lang}&error=1`);
  const saved = await readPool().query(
    `insert into mysociety.community_requests (ward_id, kind, detail, phone, blood_group)
     select id, $2, $3, $4, $5 from mysociety.wards where id = $1 and active`,
    [ward, kind, detail, phone, blood || null],
  ).catch(() => null);
  redirect(`/services?lang=${lang}&${saved?.rowCount ? 'saved' : 'error'}=1`);
}
