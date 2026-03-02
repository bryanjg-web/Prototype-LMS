-- Hertz LMS - Allow BM-created tasks without a lead (standalone tasks)
-- Fixes: null value in column "lead_id" violates not-null constraint
-- Run after 026_gm_directives.sql

-- 1. Make lead_id nullable (BMs can create personal tasks not tied to a lead)
ALTER TABLE public.tasks
  ALTER COLUMN lead_id DROP NOT NULL;

-- 2. Add assigned_branch for standalone tasks (so they show in branch task list)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_branch text;

COMMENT ON COLUMN public.tasks.assigned_branch IS 'Branch for standalone tasks (no lead); used when lead_id is null';

-- 3. Add bm_created to source check (CreateTaskModal uses this)
DO $$
DECLARE
  r text;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%source%'
  )
  LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', r);
  END LOOP;
END $$;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('gm_assigned', 'auto_translog', 'auto_other', 'bm_created'));
