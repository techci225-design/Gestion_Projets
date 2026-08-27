-- Preserve the immutable audit trail when its related project or profile is deleted.
-- The historical payload remains intact; only the no-longer-valid foreign-key link is cleared.

DO $$
DECLARE
  audit_fk record;
BEGIN
  FOR audit_fk IN
    SELECT DISTINCT constraint_name
    FROM information_schema.key_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'audit_log'
      AND column_name IN ('project_id', 'user_id')
      AND position_in_unique_constraint IS NOT NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE public.audit_log DROP CONSTRAINT %I',
      audit_fk.constraint_name
    );
  END LOOP;
END;
$$;

-- Older deletions may already have left a dangling reference. Keep the audit
-- row and its before/after payload, while clearing only the invalid link.
UPDATE public.audit_log AS audit
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.projects AS project
    WHERE project.id = audit.project_id
  );

UPDATE public.audit_log AS audit
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = audit.user_id
  );

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
