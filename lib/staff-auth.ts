import { cookies } from 'next/headers';
import { z } from 'zod';
import { readPool } from './report-store';

export const sessionCookie = 'mysociety_staff';

export async function authRequest(path: string, options: RequestInit = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const response = await fetch(new URL('/auth/v1/' + path, url), {
    ...options,
    headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  return response.ok ? await response.json() as unknown : null;
}

export async function getStaff() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const identity = z.object({ id: z.uuid() }).safeParse(await authRequest('user', {
    headers: { Authorization: 'Bearer ' + token },
  }));
  if (!identity.success) return null;
  const { rowCount } = await readPool().query(
    'select 1 from mysociety.staff_members where user_id = $1', [identity.data.id],
  );
  return rowCount ? identity.data.id : null;
}

export async function getAdmin() {
  const staff = await getStaff();
  if (!staff) return null;
  const result = await readPool().query(
    'select 1 from mysociety.staff_members where user_id = $1 and is_admin', [staff],
  );
  return result.rowCount ? staff : null;
}
