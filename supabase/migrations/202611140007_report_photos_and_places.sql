begin;
create table mysociety.report_photos (
  report_id uuid primary key references mysociety.reports(id) on delete cascade,
  image bytea not null check (octet_length(image) between 1 and 350000)
);
create table mysociety.local_places (
  id integer generated always as identity primary key,
  name text not null unique,
  latitude double precision not null check (latitude between -85 and 85),
  longitude double precision not null check (longitude between -180 and 180)
);
insert into mysociety.local_places (name, latitude, longitude)
values ('Jobner · 303328', 26.972, 75.386);
commit;
