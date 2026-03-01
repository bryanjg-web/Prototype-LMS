-- Hertz LMS - Full mock data sync (leads 6-13, tasks, lead contact info)
-- Run after 010_tasks_notes_completed_at.sql
-- Updates leads 1-5 with email/phone; inserts leads 6-13; inserts tasks

-- 1. Update existing leads (1-5) with email, phone from mockData
update public.leads set email = 'john.martinez@example.com', phone = '+14155551234' where id = 1;
update public.leads set email = 'sarah.chen@example.com', phone = '+14155555678' where id = 2;
update public.leads set email = null, phone = '+14155559999' where id = 3;
update public.leads set email = 'emily.davis@example.com', phone = null where id = 4;
-- Lead 5 (Robert Kim) - mockData doesn't show email/phone in the snippet; leave as is or add if present

-- 2. Insert additional leads (6-13) from mockData
insert into public.leads (
  customer, reservation_id, status, archived, enrichment_complete, branch, bm_name,
  days_open, mismatch, gm_directive, insurance_company, time_to_first_contact,
  first_contact_by, time_to_cancel, hles_reason, last_activity, translog, enrichment, enrichment_log, email, phone
) values
  ('Lisa Wong', 'HL-2026-001239', 'Rented', false, true, 'Santa Monica', 'M. Johnson',
   1, false, null, 'Geico', '25m', 'branch', null, null,
   '2026-02-18T09:30:00', '[{"time":"Feb 18, 9:30 AM","event":"Call","outcome":"Converted"}]'::jsonb, '{}'::jsonb, '[]'::jsonb, null, null),
  ('David Park', 'HL-2026-001240', 'Rented', false, true, 'Santa Monica', 'M. Johnson',
   2, false, null, 'State Farm', '1h 10m', 'branch', null, null,
   '2026-02-19T14:15:00', '[{"time":"Feb 19, 2:15 PM","event":"Call","outcome":"Converted"}]'::jsonb, '{}'::jsonb, '[]'::jsonb, null, null),
  ('Jennifer Adams', 'HL-2026-001241', 'Rented', false, true, 'Santa Monica', 'M. Johnson',
   1, false, null, 'Allstate', '45m', 'branch', null, null,
   '2026-02-21T11:00:00', '[{"time":"Feb 21, 11:00 AM","event":"Call","outcome":"Converted"}]'::jsonb, '{}'::jsonb, '[]'::jsonb, null, null),
  ('Tom Bradley', 'HL-2026-001242', 'Cancelled', false, true, 'Santa Monica', 'M. Johnson',
   3, false, null, 'Progressive', '2h', 'branch', '2d 4h', 'Customer no-show',
   '2026-02-19T09:00:00', '[{"time":"Feb 17, 10:00 AM","event":"Call","outcome":"Spoke — confirmed"},{"time":"Feb 19, 9:00 AM","event":"Call","outcome":"No show"}]'::jsonb,
   '{"reason":"No-show after confirmation","notes":"Customer confirmed but did not show","nextAction":"Call again","followUpDate":"Feb 25, 2026"}'::jsonb, '[]'::jsonb, null, null),
  ('Maria Santos', 'HL-2026-001243', 'Cancelled', false, false, 'Santa Monica', 'M. Johnson',
   5, false, null, 'Farmers', '4d 2h', 'hrd', '5d 1h', 'Unable to reach',
   '2026-02-20T11:00:00', '[{"time":"Feb 18, 3:00 PM","event":"Call","outcome":"No answer"},{"time":"Feb 20, 11:00 AM","event":"Call","outcome":"Voicemail"}]'::jsonb,
   null, '[]'::jsonb, null, null),
  ('Chris Nguyen', 'HL-2026-001244', 'Cancelled', false, true, 'Santa Monica', 'M. Johnson',
   2, false, null, 'Geico', '1h', 'branch', '1d 6h', null,
   '2026-02-22T09:30:00', '[{"time":"Feb 22, 9:30 AM","event":"Call","outcome":"Customer cancelled — found better rate"}]'::jsonb,
   '{"reason":"Found better rate elsewhere","notes":"Customer chose competitor","nextAction":"Close — no further action","followUpDate":null}'::jsonb, '[]'::jsonb, null, null),
  ('Rachel Green', 'HL-2026-001245', 'Unused', false, false, 'Santa Monica', 'M. Johnson',
   4, false, null, 'Allstate', '1h 30m', 'branch', null, null,
   '2026-02-17T14:00:00', '[{"time":"Feb 17, 2:00 PM","event":"Call","outcome":"Left voicemail — awaiting callback"}]'::jsonb,
   null, '[]'::jsonb, null, null),
  ('James Wilson', 'HL-2026-001246', 'Unused', false, true, 'Santa Monica', 'M. Johnson',
   3, false, null, 'State Farm', '45m', 'branch', null, null,
   '2026-02-20T10:30:00', '[{"time":"Feb 20, 10:30 AM","event":"Call","outcome":"Spoke — follow up Friday"}]'::jsonb,
   '{"reason":null,"notes":"Active opportunity","nextAction":"Call again Friday","followUpDate":"Feb 21, 2026"}'::jsonb, '[]'::jsonb, null, null);

-- 2b. Allow anon read/write on tasks (prototype: app uses anon key; tighten when auth added)
drop policy if exists "Allow public read tasks" on public.tasks;
create policy "Allow public read tasks" on public.tasks for select using (true);
drop policy if exists "Allow public write tasks" on public.tasks;
create policy "Allow public write tasks" on public.tasks for all using (true);

-- 3. Insert tasks (GM-assigned, linked to leads 2, 3, 4)
-- assigned_to and created_by are null (no auth users in seed); created_by_name and assigned_to_name stored for display
insert into public.tasks (
  title, description, notes, due_date, status, priority, lead_id, source,
  created_by_name, assigned_to_name
) values
  ('Follow up on John Martinez lead', 'Customer no-show — call again before Friday', null, '2026-02-28', 'Open', 'High', 2, 'gm_assigned', 'D. Williams', 'Sarah Chen'),
  ('Add comments to Michael Torres cancellation', 'Enrichment overdue — add reason and next action', 'Called twice, left voicemail. Will try again tomorrow.', '2026-02-27', 'In Progress', 'Medium', 3, 'gm_assigned', 'D. Williams', 'Sarah Chen'),
  ('Review Emily Davis unused lead', '8 days open with no contact — escalate if needed', null, '2026-03-01', 'Open', 'High', 4, 'gm_assigned', 'D. Williams', 'T. Rodriguez');
