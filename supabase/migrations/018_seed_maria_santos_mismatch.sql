-- Hertz LMS - Set Maria Santos as data mismatch example for BM Meeting Prep demo
-- HLES says "Unable to reach" but TRANSLOG shows 2 contact attempts — BM should add clarifying notes.
-- Run after 017_add_week_of_contact_range.sql

-- 1. Add mismatch_reason column if not present (for human-readable mismatch explanation)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS mismatch_reason text;

COMMENT ON COLUMN public.leads.mismatch_reason
  IS 'Human-readable explanation of data mismatch (HLES vs TRANSLOG vs BM comments)';

-- 2. Set Maria Santos (Santa Monica) as mismatch example for BM demo
UPDATE public.leads
SET
  mismatch = true,
  mismatch_reason = 'HLES says ''Unable to reach'' but TRANSLOG shows 2 contact attempts. Add clarifying notes before the meeting.',
  week_of = '2026-02-16'::date
WHERE reservation_id = 'HL-2026-001243';
