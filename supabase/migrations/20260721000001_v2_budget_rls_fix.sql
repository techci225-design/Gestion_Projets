-- Fix fn_user_role to return 'owner' for organization admins/owners
-- This ensures they can edit budget_lines and other project entities
CREATE OR REPLACE FUNCTION public.fn_user_role(p_project_id uuid)
 RETURNS project_role
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role project_role;
  v_org_role text;
begin
  -- Check if user is an organization owner/admin for this project's organization
  SELECT om.org_role INTO v_org_role
  FROM projects p
  JOIN organization_members om ON p.organization_id = om.organization_id
  WHERE p.id = p_project_id AND om.user_id = auth.uid()
  LIMIT 1;

  IF v_org_role IN ('owner', 'admin') THEN
    RETURN 'owner'::project_role;
  END IF;

  -- Otherwise, check project_members
  select role into v_role from project_members 
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
  
  return v_role;
end;
$function$;
