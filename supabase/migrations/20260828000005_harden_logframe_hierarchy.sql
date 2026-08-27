-- Enforce the canonical Logframe hierarchy for new and re-parented items.
-- Existing historical rows are intentionally left untouched for manual review.
CREATE OR REPLACE FUNCTION validate_logframe_item_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  parent_project_id uuid;
  parent_level logframe_level;
  expected_level logframe_level;
BEGIN
  IF NEW.parent_id IS NULL THEN
    IF NEW.level <> 'objectif_global' THEN
      RAISE EXCEPTION 'Only objectif_global items can be roots'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'A Logframe item cannot be its own parent'
      USING ERRCODE = '23514';
  END IF;

  SELECT project_id, level
    INTO parent_project_id, parent_level
  FROM logframe_items
  WHERE id = NEW.parent_id;

  IF NOT FOUND OR parent_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Logframe parent must belong to the same project'
      USING ERRCODE = '23514';
  END IF;

  expected_level := CASE NEW.level
    WHEN 'objectif_specifique' THEN 'objectif_global'::logframe_level
    WHEN 'resultat' THEN 'objectif_specifique'::logframe_level
    WHEN 'activite' THEN 'resultat'::logframe_level
    ELSE NULL
  END;

  IF expected_level IS NULL OR parent_level <> expected_level THEN
    RAISE EXCEPTION 'Invalid Logframe parent level for %', NEW.level
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_logframe_item_hierarchy ON logframe_items;

CREATE TRIGGER trg_validate_logframe_item_hierarchy
BEFORE INSERT OR UPDATE OF parent_id, level ON logframe_items
FOR EACH ROW
EXECUTE FUNCTION validate_logframe_item_hierarchy();
