-- Add operation_date to operations_journal

ALTER TABLE public.operations_journal 
ADD COLUMN IF NOT EXISTS operation_date DATE;

-- Fallback for existing records: use DATE(created_at)
UPDATE public.operations_journal 
SET operation_date = DATE(created_at) 
WHERE operation_date IS NULL;
