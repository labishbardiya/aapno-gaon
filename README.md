# mySociety

A neighborhood issue register for residents to report local needs and for staff to track them through resolution.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and check http://localhost:3000/api/health. The homepage and health endpoint work without a database. Report submission requires the setup below.

## Report intake

Apply the SQL migration in `supabase/migrations/` to a development PostgreSQL or Supabase database. Apply `supabase/seed.sql` for three sample wards. Copy `.env.example` to `.env.local`, then set `DATABASE_URL` and generate `RECEIPT_SECRET` using `openssl rand -hex 32`. Keep the secret stable across deployments because pending retries use it to reproduce the private receipt. Use a server-only database connection with TLS for hosted Supabase.

```sh
KEY=$(uuidgen)
curl -i http://localhost:3000/api/reports \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"wardId":1,"category":"streetlights","landmark":"Near the bus stop","description":"The streetlight is out."}'
```

The first request returns HTTP 201 and a ticket. Repeat the same command with the same key and payload within 24 hours to get HTTP 200 and the same receipt. Reusing the key for different data or after the 24-hour replay window returns HTTP 409. Optional `location` has `latitude`, `longitude`, `source` (`device` or `manual`), and optional device `accuracyM`. Open the receipt URL to track the report. Use /report to submit through the website and /register to browse approved reports. Staff review is available at /staff. Ward summaries are available at /overview.

## Docker

```sh
docker build -t mysociety .
docker run --rm -p 3000:3000 mysociety
```

## Architecture and delivery

Next.js and TypeScript serve the website and HTTP endpoints. Mantine provides the UI components. Supabase PostgreSQL provides durable reports, and Supabase Auth is planned for invited staff access. GitHub Actions checks types, builds the Docker image, and smoke-checks its HTTP endpoints on pushes and pull requests. The team checks the resident and staff workflows manually. Vercel will deploy the reviewed production branch.

Live Vercel URL will be added after deployment.

## Contributing

Check that CI passes before merging changes.

## Staff review and ward overview

Apply all SQL migrations in filename order. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, create or invite a staff user in Supabase Auth, and insert that user's UUID in `mysociety.staff_members`. Only listed users can use the queue. Sign in again when the access token expires.

At `/staff`, approve or reject a submission. Approved reports appear in the public register and active queue. Start work before resolving a report, and enter a public resolution note when closing it.

Set `center_latitude` and `center_longitude` on each ward using verified local coordinates to display ward markers. The table works before those coordinates are configured. The overview groups reports by ward and uses ward-center coordinates.

## Verify a build

GitHub Actions builds the Docker image, applies all migrations to a temporary PostgreSQL database, and checks the running app. It verifies that retrying a submission returns the same receipt, creates one report, and keeps the report out of the public register until review. If a run fails, open the failed step and the container log in Actions.

For a manual acceptance check, use a development database and a configured staff account.

1. Submit a sample report with a ward and landmark. Try both allowing and declining location permission. If you share a pin, move it before submitting.
2. Open the private receipt and confirm the report is waiting for review. Search for its ticket in the public register and confirm it has no result.
3. Sign in as staff, approve the report, start work, and resolve it with a note. Confirm the public register and private receipt reflect the status.
4. Open the ward overview and verify that resolving the report decreases the pending count and increases the resolved count under the same filters.

### Assignment and deadlines

Apply the routing migration before deploying this build. Configure each ward and category using an existing staff UID. For example:

```sql
insert into mysociety.routing_rules (ward_id, category, staff_id)
values (1, 'water', 'REPLACE_WITH_STAFF_UID'::uuid)
on conflict (ward_id, category) do update set staff_id = excluded.staff_id;
```

New reports use these rules at submission. Staff can claim unassigned reports from the queue. Once an assigned report is approved, its owner can publish a due date from Active reports. The date appears in private tracking and in the public register. An unresolved report becomes overdue on the following calendar day in India.

### Administration

After applying the administration migration, an authorized database operator can enable the admin dashboard for an existing staff user:

```sql
update mysociety.staff_members
set is_admin = true
where user_id = 'REPLACE_WITH_STAFF_UID'::uuid;
```

Sign in at `/staff`, then open `/admin` to edit routing rules, transfer reports, and see recent activity. Routing changes apply to new reports. Use the transfer control for existing reports.
