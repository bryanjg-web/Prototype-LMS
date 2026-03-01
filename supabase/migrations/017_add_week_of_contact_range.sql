-- Hertz LMS - Add week_of and contact_range to leads for Meeting Prep (HER-29)
-- Populated during HLES ingestion from "Week Of" and "CONTACT RANGE" columns.
-- Run after 016_seed_additional_tasks.sql

-- 1. Add week_of (date) — HLES "Week Of" e.g. 2026-02-16
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS week_of date;

COMMENT ON COLUMN public.leads.week_of
  IS 'Week Of date from HLES feed — used for Meeting Prep week selector';

-- 2. Add contact_range (text) — HLES CONTACT RANGE buckets
-- (a)<30min, (b)31min-1hr, (c)1-3 hrs, (d)3-6 hrs, (e)6-12 hrs, (f)12-24 hrs, (g)24-48 hrs, NO CONTACT
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_range text;

COMMENT ON COLUMN public.leads.contact_range
  IS 'HLES CONTACT RANGE: (a)<30min, (b)31min-1hr, (c)1-3 hrs, (d)3-6 hrs, (e)6-12 hrs, (f)12-24 hrs, (g)24-48 hrs, NO CONTACT';

-- 3. Backfill week_of from init_dt_final (Monday of that week)
UPDATE public.leads
SET week_of = date_trunc('week', init_dt_final)::date
WHERE init_dt_final IS NOT NULL
  AND week_of IS NULL;

-- 4. Backfill remaining week_of from last_activity or created_at
UPDATE public.leads
SET week_of = date_trunc('week', COALESCE(last_activity::date, created_at::date))::date
WHERE week_of IS NULL;
