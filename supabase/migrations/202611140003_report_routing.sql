begin;

create table mysociety.routing_rules (
  ward_id integer not null references mysociety.wards(id),
  category text not null check (category in ('water', 'roads', 'waste', 'drainage', 'streetlights', 'other')),
  staff_id uuid not null references mysociety.staff_members(user_id) on delete cascade,
  primary key (ward_id, category)
);

alter table mysociety.reports
  add column assigned_staff_id uuid references mysociety.staff_members(user_id) on delete set null,
  add column due_on date;

create index reports_assigned_staff on mysociety.reports (assigned_staff_id, created_at);

commit;
