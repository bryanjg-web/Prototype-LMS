-- Hertz LMS - Add avatar_url to user_profiles for profile photos
-- Run after 006_lead_contact_fields.sql

alter table public.user_profiles
  add column if not exists avatar_url text;

comment on column public.user_profiles.avatar_url is 'URL or path to profile photo (e.g. /avatars/name.png)';
