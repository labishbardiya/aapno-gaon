begin;
alter table mysociety.staff_members add column is_admin boolean not null default false;
alter table mysociety.reports add column resolved_at timestamptz;
update mysociety.reports r set resolved_at = (
  select max(created_at) from mysociety.report_events where report_id = r.id and event_type = 'RESOLVE'
) where r.status = 'RESOLVED';
create table mysociety.routing_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  ward_id integer not null,
  category text not null,
  staff_id uuid not null,
  created_at timestamptz not null default now()
);
commit;
