-- Fix infinite recursion on project_members

-- 1. Create a security definer function to get the current user's project IDs without triggering RLS recursively
create or replace function get_my_project_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select project_id from project_members where user_id = auth.uid();
$$;

-- 2. Drop the recursive policies
drop policy if exists "read_all_members" on project_members;
drop policy if exists "read_all_projects" on projects;

-- 3. Recreate them using the secure function
create policy "read_all_projects" on projects 
for select using (id in (select get_my_project_ids()));

create policy "read_all_members" on project_members 
for select using (project_id in (select get_my_project_ids()));
