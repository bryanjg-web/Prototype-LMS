-- Hertz LMS - Fix tasks priority constraint (repair if inconsistent)
-- Run after 027_tasks_allow_standalone_bm_created.sql
-- Ensures priority accepts only High, Medium, Low (fixes priority check violation on insert)

-- 1. Drop existing priority check constraint(s) first
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

-- 2. Normalize any invalid priority values to Medium (while constraint is dropped)
UPDATE public.tasks
SET priority = 'Medium'
WHERE priority IS NULL OR priority NOT IN ('High', 'Medium', 'Low');

-- 3. Re-add constraint
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('High', 'Medium', 'Low'));

ALTER TABLE public.tasks
  ALTER COLUMN priority SET DEFAULT 'Medium';
