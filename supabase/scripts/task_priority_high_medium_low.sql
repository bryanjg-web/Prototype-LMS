-- =============================================================================
-- Task Priority: Restrict to High, Medium, Low only
-- =============================================================================
-- Run this in Supabase: Dashboard → SQL Editor → New query → Paste → Run
-- =============================================================================

-- 1. Migrate existing data: Urgent -> High, Normal -> Medium, NULL -> Medium
UPDATE public.tasks SET priority = 'High' WHERE priority = 'Urgent';
UPDATE public.tasks SET priority = 'Medium' WHERE priority = 'Normal';
UPDATE public.tasks SET priority = 'Medium' WHERE priority IS NULL;

-- 2. Drop old check constraint (finds any check constraint on priority)
DO $$
DECLARE
  r text;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%priority%'
  )
  LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r);
  END LOOP;
END $$;

-- 3. Add new check constraint and default
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('High', 'Medium', 'Low'));

ALTER TABLE public.tasks
  ALTER COLUMN priority SET DEFAULT 'Medium';

ALTER TABLE public.tasks
  ALTER COLUMN priority SET NOT NULL;

COMMENT ON COLUMN public.tasks.priority IS 'Task priority: High, Medium, or Low';
