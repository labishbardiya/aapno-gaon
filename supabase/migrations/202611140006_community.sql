begin;
create table mysociety.community_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('lost', 'found', 'blood-request', 'donor')),
  ward_id integer not null references mysociety.wards(id),
  detail text not null check (char_length(detail) between 1 and 1000),
  phone text not null,
  blood_group text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind in ('blood-request','donor')) = (blood_group is not null))
);
create table mysociety.community_directory (
  id bigint generated always as identity primary key,
  section text not null check (section in ('notice','guide','contact')),
  title text not null,
  detail text not null,
  published boolean not null default false
);
commit;
