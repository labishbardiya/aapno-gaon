begin;
with fixtures(n,village,category,landmark,description,state,days,fix) as (values
(1,'Dhindha','water','Near the main bus shelter','The public tap runs for a few minutes each morning, then the pressure drops. Several households are filling containers here.','IN_PROGRESS',4,null),
(2,'Dhindha','streetlights','Lane beside the community hall','Two lights in the lane have been off since the weekend. The path is dark after the last bus.','RESOLVED',8,'Replaced the failed LED fittings and checked both lights after dusk.'),
(3,'Dhindha','waste','Collection point by the market entrance','Sacks are piling up beside the collection point and blocking the footpath.','SUBMITTED',2,null),
(4,'Dhindha','other','Community hall entrance','The village noticeboard has a broken latch and notices come loose in the wind.','SUBMITTED',1,null),
(5,'Bhagwatpura','roads','Approach to the primary school','A pothole has widened near the bend. Cyclists have to move into the middle of the road to pass.','IN_PROGRESS',6,null),
(6,'Bhagwatpura','water','Public standpipe near the main lane','Water collects around the base of the standpipe even when the tap is shut.','RESOLVED',11,'Replaced the standpipe valve and cleared water from the base.'),
(7,'Bhagwatpura','drainage','Culvert at the village entrance','Leaves and silt are blocking the culvert outlet. Runoff stayed on the road after the rain.','SUBMITTED',3,null),
(8,'Bhagwatpura','streetlights','Turnoff to the school lane','The streetlight at the turnoff keeps switching on and off after dark.','REVIEW',1,null),
(9,'Chandsinghpura','sanitation','Public toilet near the meeting hall','The washbasin is blocked and water is pooling on the floor.','RESOLVED',9,'Cleared the drain and tested the basin with running water.'),
(10,'Chandsinghpura','roads','Lane opposite the dairy collection point','Loose gravel has spread across the crossing and is slippery for two-wheelers.','SUBMITTED',5,null),
(11,'Chandsinghpura','water','Public tap on the north lane','No water came from the public tap during the morning supply window.','REVIEW',1,null),
(12,'Chandsinghpura','waste','Waste collection point off the main road','A damaged bin lid is allowing stray animals to scatter rubbish onto the road.','IN_PROGRESS',7,null),
(13,'Kanderiyan Ki Dhani','waterlogging','Junction near the main approach','A shallow pool still covers part of the junction two days after rain.','IN_PROGRESS',5,null),
(14,'Kanderiyan Ki Dhani','streetlights','Footpath to the main road','The light beside the footpath has been out for three evenings.','RESOLVED',12,'Reconnected the loose supply wire and checked that the light stayed on.'),
(15,'Kanderiyan Ki Dhani','waste','Shared collection point near the approach road','The bin is full and the last collection appears to have been missed.','REVIEW',2,null),
(16,'Kanderiyan Ki Dhani','other','Village meeting area','The direction sign at the entrance has turned and now points down the wrong lane.','REVIEW',1,null)
), inserted as (
insert into mysociety.reports (ticket_code,receipt_token_hash,ward_id,category,landmark,description,status,visibility,version,assigned_staff_id,created_at,updated_at,due_on,resolved_at)
select 'MS-DEMO' || lpad(f.n::text,12,'0'), encode(sha256(gen_random_uuid()::text::bytea),'hex'),
w.id,f.category,f.landmark,f.description,case when f.state='REVIEW' then 'SUBMITTED' else f.state end,
case when f.state='REVIEW' then 'PENDING_REVIEW' else 'APPROVED' end,
case f.state when 'RESOLVED' then 5 when 'IN_PROGRESS' then 4 when 'REVIEW' then 1 else 2 end,
rr.staff_id,now()-make_interval(days=>f.days),now()-make_interval(days=>greatest(f.days-3,0)),
case when f.state in ('IN_PROGRESS','RESOLVED') then current_date-f.days+5 end,
case when f.state='RESOLVED' then now()-make_interval(days=>f.days-3) end
from fixtures f join mysociety.wards w on w.name=f.village
left join mysociety.routing_rules rr on rr.ward_id=w.id and rr.category=f.category
on conflict (ticket_code) do nothing returning *
)
insert into mysociety.report_events (report_id,actor_id,event_type,old_status,new_status,note,created_at)
select i.id,e.actor,e.kind,e.old_status,e.new_status,e.note,e.at
from inserted i join fixtures f on i.ticket_code='MS-DEMO' || lpad(f.n::text,12,'0')
cross join lateral (values
(1,'REPORT_CREATED',null::uuid,null,'SUBMITTED',null,i.created_at,true),
(2,'AUTO_ASSIGNED',null::uuid,null,null,i.assigned_staff_id::text,i.created_at,i.assigned_staff_id is not null),
(3,'APPROVE',i.assigned_staff_id,'SUBMITTED','SUBMITTED',null,i.created_at+interval '3 hours',i.visibility='APPROVED'),
(4,'DEADLINE',i.assigned_staff_id,'SUBMITTED','SUBMITTED',i.due_on::text,i.created_at+interval '5 hours',i.due_on is not null),
(5,'START',i.assigned_staff_id,'SUBMITTED','IN_PROGRESS',null,i.created_at+interval '1 day',i.status in ('IN_PROGRESS','RESOLVED')),
(6,'RESOLVE',i.assigned_staff_id,'IN_PROGRESS','RESOLVED',f.fix,i.resolved_at,i.status='RESOLVED')
) e(seq,kind,actor,old_status,new_status,note,at,include)
where e.include order by i.id,e.seq;
commit;
