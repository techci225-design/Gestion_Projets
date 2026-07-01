-- Correction de la fonction d'audit pour gérer génériquement project_id
create or replace function trg_audit_log() returns trigger as $$
declare
  v_project_id uuid;
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := to_jsonb(OLD);
begin
  if TG_TABLE_NAME = 'projects' then
    v_project_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  else
    v_project_id := coalesce((v_new->>'project_id')::uuid, (v_old->>'project_id')::uuid);
  end if;

  insert into audit_log (project_id, user_id, action, entity_table, entity_id, before_data, after_data)
  values (
    v_project_id,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then v_old else null end,
    case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then v_new else null end
  );
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$ language plpgsql security definer;
