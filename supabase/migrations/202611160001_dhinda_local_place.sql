update mysociety.local_places
set name = 'Dhinda · 303328', latitude = 26.8899, longitude = 75.3631
where name = 'Jobner · 303328'
  and latitude = 26.972 and longitude = 75.386
  and not exists (select 1 from mysociety.local_places where name = 'Dhinda · 303328');
