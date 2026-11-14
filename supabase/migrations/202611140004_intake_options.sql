begin;

alter table mysociety.wards add column coverage_hint text;
alter table mysociety.reports add column callback_name text, add column callback_phone text;
alter table mysociety.reports drop constraint reports_category_check;
alter table mysociety.routing_rules drop constraint routing_rules_category_check;
alter table mysociety.reports add constraint reports_category_check
  check (category in ('water','roads','waste','drainage','streetlights','waterlogging',
    'stray-animals','mosquito-control','education','sanitation','employment','housing-pensions','other'));
alter table mysociety.routing_rules add constraint routing_rules_category_check
  check (category in ('water','roads','waste','drainage','streetlights','waterlogging',
    'stray-animals','mosquito-control','education','sanitation','employment','housing-pensions','other'));

create table mysociety.daily_intake (
  reporter_key text not null,
  day date not null,
  submissions integer not null check (submissions > 0),
  primary key (reporter_key, day)
);

create table mysociety.report_support (
  report_id uuid not null references mysociety.reports(id) on delete cascade,
  reporter_key text not null,
  primary key (report_id, reporter_key)
);

commit;
