-- 0013: Trigger to apply / reverse an approved change order's delta
--       onto the linked project and (optionally) job order contract values.
--
-- Transitions handled:
--   any  → approved : add amount_delta to contract values
--   approved → any  : subtract amount_delta (undo)

create or replace function fn_apply_change_order_delta()
returns trigger
language plpgsql
as $$
begin
  -- Transition TO approved: apply the delta
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    update projects
      set contract_value = contract_value + new.amount_delta
      where id = new.project_id;

    if new.job_order_id is not null then
      update job_orders
        set contract_value = contract_value + new.amount_delta
        where id = new.job_order_id;
    end if;
  end if;

  -- Transition FROM approved: reverse the delta
  if old.status = 'approved' and new.status != 'approved' then
    update projects
      set contract_value = contract_value - old.amount_delta
      where id = old.project_id;

    if old.job_order_id is not null then
      update job_orders
        set contract_value = contract_value - old.amount_delta
        where id = old.job_order_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_change_order_apply_delta
  after update of status on change_orders
  for each row
  execute function fn_apply_change_order_delta();
