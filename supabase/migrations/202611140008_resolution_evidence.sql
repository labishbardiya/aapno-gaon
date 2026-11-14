begin;
create table mysociety.resolution_evidence (
  report_id uuid primary key references mysociety.reports(id) on delete cascade,
  image bytea not null check (octet_length(image) between 1 and 350000)
);
commit;
