-- 0015: Enable hard delete of job orders by master admin.
--
-- change_orders.job_order_id had no ON DELETE clause (defaults to RESTRICT),
-- which would block deleting a job order that has linked change orders.
-- Re-create the FK as ON DELETE SET NULL so the link is cleared instead.

alter table change_orders
  drop constraint if exists change_orders_job_order_id_fkey;

alter table change_orders
  add constraint change_orders_job_order_id_fkey
  foreign key (job_order_id) references job_orders(id)
  on delete set null;

-- Allow master admin to hard-delete job orders
create policy job_orders_delete on job_orders
  for delete
  to authenticated
  using (fn_is_master_admin());
