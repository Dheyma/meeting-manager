-- Decisions can be reordered by dragging; sort_order drives the number shown.
alter table decisions add column if not exists sort_order integer;
update decisions d set sort_order = r.rn
from (select id, row_number() over (partition by meeting_id order by created_at, id) - 1 as rn from decisions) r
where d.id = r.id and d.sort_order is null;
