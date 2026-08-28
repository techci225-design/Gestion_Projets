-- Move the former one-indicator-per-item fields into the canonical indicator model.
-- The legacy fields remain as a temporary compatibility bridge for the existing form.
CREATE UNIQUE INDEX IF NOT EXISTS uq_logframe_indicators_legacy_item
  ON logframe_indicators (logframe_item_id)
  WHERE code = '__legacy__';

INSERT INTO logframe_indicators (
  project_id, logframe_item_id, code, name, type,
  baseline_text, target_text, verification_source
)
SELECT
  project_id,
  id,
  '__legacy__',
  btrim(indicator),
  'qualitative',
  NULLIF(btrim(baseline), ''),
  NULLIF(btrim(target), ''),
  NULLIF(btrim(verification_source), '')
FROM logframe_items
WHERE NULLIF(btrim(indicator), '') IS NOT NULL
ON CONFLICT (logframe_item_id) WHERE code = '__legacy__' DO UPDATE SET
  name = EXCLUDED.name,
  baseline_text = EXCLUDED.baseline_text,
  target_text = EXCLUDED.target_text,
  verification_source = EXCLUDED.verification_source,
  updated_at = now();

CREATE OR REPLACE FUNCTION sync_legacy_logframe_indicator()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NULLIF(btrim(NEW.indicator), '') IS NULL THEN
    DELETE FROM logframe_indicators
    WHERE logframe_item_id = NEW.id AND code = '__legacy__';
    RETURN NEW;
  END IF;

  INSERT INTO logframe_indicators (
    project_id, logframe_item_id, code, name, type,
    baseline_text, target_text, verification_source
  ) VALUES (
    NEW.project_id, NEW.id, '__legacy__', btrim(NEW.indicator), 'qualitative',
    NULLIF(btrim(NEW.baseline), ''),
    NULLIF(btrim(NEW.target), ''),
    NULLIF(btrim(NEW.verification_source), '')
  )
  ON CONFLICT (logframe_item_id) WHERE code = '__legacy__' DO UPDATE SET
    name = EXCLUDED.name,
    baseline_text = EXCLUDED.baseline_text,
    target_text = EXCLUDED.target_text,
    verification_source = EXCLUDED.verification_source,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_logframe_indicator ON logframe_items;
CREATE TRIGGER trg_sync_legacy_logframe_indicator
AFTER INSERT OR UPDATE OF indicator, baseline, target, verification_source ON logframe_items
FOR EACH ROW EXECUTE FUNCTION sync_legacy_logframe_indicator();
