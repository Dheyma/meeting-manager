-- Track who created each meeting so creators can always see/edit their own meetings
alter table meetings add column if not exists created_by uuid references people(id) on delete set null;

-- Backfill from the "Created meeting" entries in system_logs (title match, closest in time)
update meetings m
set created_by = s.person_id
from (
  select distinct on (m2.id) m2.id as meeting_id, l.person_id
  from meetings m2
  join system_logs l
    on l.action = 'Created meeting'
   and l.entity_description = m2.title
   and abs(extract(epoch from (l.created_at - m2.created_at))) < 600
  order by m2.id, abs(extract(epoch from (l.created_at - m2.created_at)))
) s
where m.id = s.meeting_id and m.created_by is null;
