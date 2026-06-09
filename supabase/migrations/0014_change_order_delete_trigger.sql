-- 0014: Reverse delta when an approved change order is deleted.
--       Handles the case where a master admin removes an already-approved CO —
--       the project (and linked job order) contract values must be rolled back.

create or replace function fn_reverse_deleted_change_order()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'approved' then
    update projects
      set contract_value = contract_value - old.amount_delta
      where id = old.project_id;

    if old.job_order_id is not null then
      update job_orders
        set contract_value = contract_value - old.amount_delta
        where id = old.job_order_id;
    end if;
  end if;

  return old;
end;
$$;

create trigger trg_reverse_deleted_change_order
  before delete on change_orders
  for each row
  execute function fn_reverse_deleted_change_order();
