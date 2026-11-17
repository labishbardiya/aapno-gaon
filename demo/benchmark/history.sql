with inserted as (
  insert into mysociety.reports
    (ticket_code, receipt_token_hash, ward_id, category, landmark, description, status, visibility, created_at, updated_at, resolved_at)
  select 'MS-HISTORY' || lpad(n::text, 10, '0'), md5('synthetic-benchmark-' || n),
    n % 4 + 1, (array['water','roads','waste','streetlights'])[n % 4 + 1],
    'Synthetic benchmark village landmark ' || n,
    'Synthetic report for benchmark history, generated to test public data reads.',
    case when n % 4 = 0 then 'SUBMITTED' else 'RESOLVED' end, 'APPROVED',
    now() - make_interval(days=> n % 365 + 1),
    now() - make_interval(days=> n % 365),
    case when n % 4 <> 0 then now() - make_interval(days=> n % 365) end
  from generate_series(1, :rows) as n
  returning id, ticket_code
)
insert into mysociety.report_photos (report_id,image)
select id, decode(:'photo','base64') from inserted where right(ticket_code, 1) = '0';
analyze mysociety.reports;
