-- Action items can be reordered by dragging; sort_order drives the SL # shown.
alter table action_items add column if not exists sort_order integer;
update action_items a set sort_order = r.rn
from (select id, row_number() over (partition by meeting_id order by created_at, id) - 1 as rn from action_items) r
where a.id = r.id and a.sort_order is null;
