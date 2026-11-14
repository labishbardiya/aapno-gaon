import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import type { ReportInput } from './report-input';

let pool: Pool | undefined;

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function createReport(key: string, input: ReportInput, identity: { reporter: string; network: string }, image?: Buffer, originalPhoto?: string) {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.RECEIPT_SECRET;
  if (!connectionString || !secret || Buffer.byteLength(secret) < 32) {
    throw new Error('Report intake configuration is missing.');
  }

  const location = input.location ?? null;
  const requestHash = sha256(JSON.stringify({
    wardId: input.wardId,
    category: input.category,
    landmark: input.landmark,
    description: input.description,
    ...(input.callbackName && { callbackName: input.callbackName }),
    ...(input.callbackPhone && { callbackPhone: input.callbackPhone }),
    ...(originalPhoto && { photoHash: sha256(originalPhoto) }),
    location: location && { ...location, accuracyM: location.accuracyM ?? null },
  }));
  pool ??= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 3000 });
  const client = await pool.connect();

  try {
    await client.query('begin');
    // Serialize retries for a key before looking up or creating its report.
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    const existing = await client.query<{ ticket_code: string; request_hash: string; expired: boolean }>(
      `select r.ticket_code, k.request_hash, k.expires_at <= now() as expired
       from mysociety.submission_keys k join mysociety.reports r on r.id = k.report_id
       where k.key = $1`, [key],
    );
    const previous = existing.rows[0];
    if (previous && (previous.expired || previous.request_hash !== requestHash)) {
      await client.query('rollback');
      return { kind: 'conflict' } as const;
    }

    const ticketCode = previous?.ticket_code ?? `MS-${randomBytes(9).toString('hex').toUpperCase()}`;
    const token = createHmac('sha256', secret).update(`receipt:${key}:${ticketCode}`).digest('base64url');

    if (!previous) {
      const buckets = identity.reporter === identity.network ? [[identity.network, 3]] :
        [[identity.network, 30], [identity.reporter, 3]];
      for (const [bucket, limit] of buckets) {
        const used = await client.query(
          `insert into mysociety.daily_intake (reporter_key, day, submissions)
           values ($1, (now() at time zone 'Asia/Kolkata')::date, 1)
           on conflict (reporter_key, day) do update set submissions = daily_intake.submissions + 1
           where daily_intake.submissions < $2`, [bucket, limit],
        );
        if (!used.rowCount) {
          await client.query('rollback');
          return { kind: 'limited' } as const;
        }
      }

      const inserted = await client.query<{ id: string }>(
        `insert into mysociety.reports
           (ticket_code, receipt_token_hash, ward_id, category, landmark, description,
            latitude, longitude, accuracy_m, pin_source, callback_name, callback_phone)
         select $1, $2, id, $4, $5, $6, $7, $8, $9, $10, $11, $12
         from mysociety.wards where id = $3 and active for share
         returning id`,
        [ticketCode, sha256(token), input.wardId, input.category, input.landmark, input.description,
          location?.latitude, location?.longitude, location?.accuracyM, location?.source, input.callbackName, input.callbackPhone],
      );
      const report = inserted.rows[0];
      if (!report) {
        await client.query('rollback');
        return { kind: 'invalidWard' } as const;
      }

      if (image) {
        await client.query('insert into mysociety.report_photos (report_id, image) values ($1, $2)', [report.id, image]);
      }
      await client.query(
        `insert into mysociety.report_events (report_id, event_type, new_status)
         values ($1, 'REPORT_CREATED', 'SUBMITTED')`, [report.id],
      );
      await client.query(
        `with assigned as (
           update mysociety.reports r set assigned_staff_id = rule.staff_id
           from mysociety.routing_rules rule
           where r.id = $1 and r.ward_id = rule.ward_id and r.category = rule.category
           returning r.id, r.assigned_staff_id
         )
         insert into mysociety.report_events (report_id, event_type, note)
         select id, 'AUTO_ASSIGNED', assigned_staff_id::text from assigned`, [report.id],
      );

      await client.query(
        `insert into mysociety.submission_keys (key, request_hash, report_id, expires_at)
         values ($1, $2, $3, now() + interval '24 hours')`, [key, requestHash, report.id],
      );
    }

    await client.query('commit');
    return {
      kind: 'accepted',
      replayed: Boolean(previous),
      receipt: { ticketCode, status: 'SUBMITTED', receiptUrl: `/track/${token}` },
    } as const;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export function readPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Database is not configured.');
  pool ??= new Pool({ connectionString, max: 3, connectionTimeoutMillis: 3000 });
  return pool;
}

export async function getWards() {
  const { rows } = await readPool().query<{ id: number; name: string; coverage_hint: string | null }>(
    'select id, name, coverage_hint from mysociety.wards where active order by id',
  );
  return rows;
}

export async function getReceipt(token: string) {
  const { rows } = await readPool().query<{ ticket_code: string; status: string; visibility: string; due_on: string | null }>(
    'select ticket_code, status, visibility, due_on::text from mysociety.reports where receipt_token_hash = $1',
    [sha256(token)],
  );
  return rows[0];
}

export async function getPublicReports(q: string, ward: string, status: string, category: string, before?: string, sort = "recent", view = "") {
  const db = readPool();
  const { rows: [schema] } = await db.query<{ evidence: string | null }>(
    "select to_regclass('mysociety.resolution_evidence')::text as evidence",
  );
  const { rows } = await db.query<{
    ticket_code: string; ward: string; category: string; description: string; status: string; due_on: string | null; overdue: boolean; supporters: number;
  }>(
    `select r.ticket_code, w.name as ward, r.category, r.description, r.status, r.due_on::text,
       coalesce(r.status <> 'RESOLVED' and r.due_on < (now() at time zone 'Asia/Kolkata')::date, false) as overdue, support.total as supporters
     from mysociety.reports r join mysociety.wards w on w.id = r.ward_id
     cross join lateral (select count(*)::int as total from mysociety.report_support where report_id = r.id) support
     where r.visibility = 'APPROVED'
       and ($1 = '' or strpos(lower(r.description || ' ' || r.ticket_code), lower($1)) > 0)
       and ($2 = '' or w.id::text = $2)
       and ($3 = '' or r.status = $3)
       and ($4 = '' or r.category = $4)
       and case $7
         when 'overdue' then r.status <> 'RESOLVED' and r.due_on < (now() at time zone 'Asia/Kolkata')::date
         when 'forwarded' then exists (select 1 from mysociety.report_events where report_id = r.id and event_type = 'FORWARDED')
         when 'evidence' then ${schema.evidence ? "r.status = 'RESOLVED' and exists (select 1 from mysociety.resolution_evidence where report_id = r.id)" : "false"}
         else true end
       and ($5 = '' or (case when $6 = 'affected' then support.total else 0 end, r.created_at, r.id) < (
         select case when $6 = 'affected' then (select count(*) from mysociety.report_support where report_id = cursor_report.id) else 0 end, created_at, id from mysociety.reports cursor_report where ticket_code = $5 and visibility = 'APPROVED'
       ))
     order by case when $6 = 'affected' then support.total else 0 end desc, r.created_at desc, r.id desc limit 51`, [q, ward, status, category, before ?? '', sort, view],
  );
  return rows;
}
