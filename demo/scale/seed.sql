begin;
insert into mysociety.wards (name,center_latitude,center_longitude) values
  ('Dhindha',26.8899,75.3631), ('Bhagwatpura',null,null),
  ('Chandsinghpura',null,null), ('Kanderiyan Ki Dhani',null,null);
insert into mysociety.staff_members (user_id,is_admin) values
  ('30000000-0000-4000-8000-000000000001',true),
  ('30000000-0000-4000-8000-000000000002',false),
  ('30000000-0000-4000-8000-000000000003',false),
  ('30000000-0000-4000-8000-000000000004',false);
insert into mysociety.routing_rules (ward_id,category,staff_id)
select w.id, r.category, r.staff_id::uuid
from mysociety.wards w cross join (values
  ('water','30000000-0000-4000-8000-000000000002'),
  ('roads','30000000-0000-4000-8000-000000000003'),
  ('streetlights','30000000-0000-4000-8000-000000000003'),
  ('waste','30000000-0000-4000-8000-000000000004'),
  ('drainage','30000000-0000-4000-8000-000000000004'),
  ('waterlogging','30000000-0000-4000-8000-000000000004'),
  ('sanitation','30000000-0000-4000-8000-000000000004')
) r(category,staff_id);
commit;
