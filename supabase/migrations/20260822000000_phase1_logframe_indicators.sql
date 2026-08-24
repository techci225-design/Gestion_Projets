-- Phase 1: Nouvelles tables pour le suivi des indicateurs (Modèle Additif)

CREATE TABLE IF NOT EXISTS logframe_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    logframe_item_id UUID NOT NULL REFERENCES logframe_items(id) ON DELETE CASCADE,
    code TEXT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('quantitative', 'qualitative')),
    unit TEXT NULL,
    baseline_numeric NUMERIC NULL,
    baseline_text TEXT NULL,
    target_numeric NUMERIC NULL,
    target_text TEXT NULL,
    frequency TEXT NULL,
    responsible TEXT NULL,
    verification_source TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logframe_indicators_logframe_item_id ON logframe_indicators(logframe_item_id);
CREATE INDEX IF NOT EXISTS idx_logframe_indicators_project_id ON logframe_indicators(project_id);

CREATE TABLE IF NOT EXISTS logframe_indicator_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    indicator_id UUID NOT NULL REFERENCES logframe_indicators(id) ON DELETE CASCADE,
    measured_at DATE NULL,
    period_type TEXT NULL CHECK (period_type IN ('semester', 'quarter', 'month', 'year')),
    period_number INTEGER NULL,
    period_year INTEGER NULL,
    value_numeric NUMERIC NULL,
    value_text TEXT NULL,
    comment TEXT NULL,
    source_url TEXT NULL,
    created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logframe_indicator_tracking_indicator_id ON logframe_indicator_tracking(indicator_id);
CREATE INDEX IF NOT EXISTS idx_logframe_indicator_tracking_project_id ON logframe_indicator_tracking(project_id);

-- RLS
ALTER TABLE logframe_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE logframe_indicator_tracking ENABLE ROW LEVEL SECURITY;

-- Policies pour logframe_indicators
CREATE POLICY "read_logframe_indicators" ON logframe_indicators FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = logframe_indicators.project_id AND user_id = auth.uid())
);

CREATE POLICY "write_logframe_indicators" ON logframe_indicators FOR ALL USING (
  fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER')
);

-- Policies pour logframe_indicator_tracking
CREATE POLICY "read_logframe_indicator_tracking" ON logframe_indicator_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = logframe_indicator_tracking.project_id AND user_id = auth.uid())
);

CREATE POLICY "write_logframe_indicator_tracking" ON logframe_indicator_tracking FOR ALL USING (
  fn_user_role(project_id) IN ('OWNER', 'PROJECT_MANAGER')
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_logframe_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_logframe_indicators_modtime
BEFORE UPDATE ON logframe_indicators
FOR EACH ROW EXECUTE FUNCTION update_logframe_indicators_updated_at();

CREATE OR REPLACE FUNCTION update_logframe_indicator_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_logframe_indicator_tracking_modtime
BEFORE UPDATE ON logframe_indicator_tracking
FOR EACH ROW EXECUTE FUNCTION update_logframe_indicator_tracking_updated_at();

-- Audit Log Triggers
CREATE TRIGGER trg_audit_logframe_indicators 
AFTER INSERT OR UPDATE OR DELETE ON logframe_indicators 
FOR EACH ROW EXECUTE FUNCTION trg_audit_log();

CREATE TRIGGER trg_audit_logframe_indicator_tracking 
AFTER INSERT OR UPDATE OR DELETE ON logframe_indicator_tracking 
FOR EACH ROW EXECUTE FUNCTION trg_audit_log();
