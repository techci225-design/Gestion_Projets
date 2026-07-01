-- Fix infinite recursion by using PL/pgSQL to prevent function inlining
create or replace function fn_user_role(p_project_id uuid)
returns project_role
language plpgsql security definer stable set search_path = public as $$
declare
  v_role project_role;
begin
  select role into v_role from project_members 
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
  return v_role;
end;
$$;
