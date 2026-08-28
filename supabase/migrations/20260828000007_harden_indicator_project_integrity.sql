-- Prevent cross-project references even when writes bypass Server Actions.
CREATE OR REPLACE FUNCTION validate_logframe_indicator_project()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE item_project_id uuid;
BEGIN
  SELECT project_id INTO item_project_id FROM logframe_items WHERE id = NEW.logframe_item_id;
  IF NOT FOUND OR item_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Indicator and Logframe item must belong to the same project' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_logframe_tracking_project()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE indicator_project_id uuid;
BEGIN
  SELECT project_id INTO indicator_project_id FROM logframe_indicators WHERE id = NEW.indicator_id;
  IF NOT FOUND OR indicator_project_id <> NEW.project_id THEN
    RAISE EXCEPTION 'Tracking and indicator must belong to the same project' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_logframe_indicator_project ON logframe_indicators;
CREATE TRIGGER trg_validate_logframe_indicator_project
BEFORE INSERT OR UPDATE OF project_id, logframe_item_id ON logframe_indicators
FOR EACH ROW EXECUTE FUNCTION validate_logframe_indicator_project();

DROP TRIGGER IF EXISTS trg_validate_logframe_tracking_project ON logframe_indicator_tracking;
CREATE TRIGGER trg_validate_logframe_tracking_project
BEFORE INSERT OR UPDATE OF project_id, indicator_id ON logframe_indicator_tracking
FOR EACH ROW EXECUTE FUNCTION validate_logframe_tracking_project();
