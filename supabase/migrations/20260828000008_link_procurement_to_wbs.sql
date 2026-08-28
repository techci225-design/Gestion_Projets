-- =========================================================
-- PPM : LIEN OPTIONNEL VERS LA WBS
-- =========================================================
-- Un marche peut etre rattache a une tache WBS du meme projet pour la
-- tracabilite operationnelle. Ce lien n'a aucun effet financier ou EVM.

ALTER TABLE public.procurement_plan
  ADD COLUMN wbs_task_id uuid
  REFERENCES public.wbs_tasks(id)
  ON DELETE SET NULL;

CREATE INDEX procurement_plan_wbs_task_id_idx
  ON public.procurement_plan(wbs_task_id)
  WHERE wbs_task_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_validate_procurement_wbs_task()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_wbs_project_id uuid;
BEGIN
  IF NEW.wbs_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT project_id
  INTO v_wbs_project_id
  FROM public.wbs_tasks
  WHERE id = NEW.wbs_task_id;

  IF v_wbs_project_id IS NULL THEN
    RAISE EXCEPTION 'Tache WBS introuvable';
  END IF;

  IF v_wbs_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'La tache WBS doit appartenir au meme projet que le marche';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_procurement_wbs_task
BEFORE INSERT OR UPDATE OF project_id, wbs_task_id
ON public.procurement_plan
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_procurement_wbs_task();
