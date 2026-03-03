-- Hertz LMS - Add optional cosmetic title to user_profiles
-- When set, displayed instead of role-based label (e.g. "Chief Executive Officer" for GM users).
-- Role (bm/gm/admin) remains unchanged for auth and routing.

alter table public.user_profiles
  add column if not exists title text;

comment on column public.user_profiles.title is 'Optional display title (e.g. Chief Executive Officer). Cosmetic only; role controls auth and views.';
