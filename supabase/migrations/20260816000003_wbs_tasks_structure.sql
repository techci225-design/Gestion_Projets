-- Add new columns for the hierarchical WBS structure
ALTER TABLE wbs_tasks 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES wbs_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'TASK' CHECK (task_type IN ('SUMMARY', 'TASK', 'MILESTONE')),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill 'name' using 'description' if it is empty (since 'name' is newly added)
UPDATE wbs_tasks SET name = SUBSTRING(description, 1, 100) WHERE name IS NULL;

-- Make name NOT NULL after backfilling
ALTER TABLE wbs_tasks ALTER COLUMN name SET NOT NULL;
