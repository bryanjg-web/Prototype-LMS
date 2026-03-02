-- Hertz LMS — Seed "this week" (Feb 16–22 2026) leads for GM branches
-- that had no leads in the current demo week: Downtown LA, Pasadena, Long Beach.
-- Ensures Spot Check shows data for every branch under D. Williams.
-- Run after 023_user_profiles_avatar_url.sql

INSERT INTO public.leads (
  customer, reservation_id, status, archived, enrichment_complete,
  branch, bm_name, days_open, mismatch, mismatch_reason, gm_directive,
  insurance_company, time_to_first_contact, first_contact_by,
  time_to_cancel, hles_reason, last_activity,
  translog, enrichment, enrichment_log,
  email, phone,
  init_dt_final, week_of, contact_range
) VALUES

-- ── Downtown LA  (J. Smith) — 3 leads in Feb 16–22 ─────────────────

('Patricia Gomez', 'HL-2026-001301', 'Rented', false, true,
 'Downtown LA', 'J. Smith', 1, false, null, null,
 'Geico', '22m', 'branch', null, null,
 '2026-02-17T10:30:00',
 '[{"time":"Feb 17, 10:30 AM","event":"Call","outcome":"Converted"}]'::jsonb,
 '{}'::jsonb, '[]'::jsonb,
 'patricia.gomez@example.com', '+14155552001',
 '2026-02-17', '2026-02-16', '(a)<30min'),

('Derek Lawson', 'HL-2026-001302', 'Cancelled', false, true,
 'Downtown LA', 'J. Smith', 3, false, null, null,
 'Progressive', '1h 30m', 'branch', '2d 8h', 'Customer no-show',
 '2026-02-19T14:00:00',
 '[{"time":"Feb 17, 11:00 AM","event":"Call","outcome":"Spoke — confirmed pickup"},{"time":"Feb 19, 2:00 PM","event":"Call","outcome":"No show — left voicemail"}]'::jsonb,
 '{"reason":"No-show after confirmation","notes":"Confirmed for Wednesday but never arrived","nextAction":"Call again","followUpDate":"Feb 25, 2026"}'::jsonb,
 '[]'::jsonb,
 'derek.lawson@example.com', '+14155552002',
 '2026-02-17', '2026-02-16', '(b)31min-1hr'),

('Nina Vasquez', 'HL-2026-001303', 'Cancelled', false, false,
 'Downtown LA', 'J. Smith', 5, true,
 'HLES says "Unable to reach" but TRANSLOG shows branch call on Feb 18. Clarify notes.',
 null,
 'State Farm', '4d 1h', 'hrd', '5d 3h', 'Unable to reach',
 '2026-02-21T16:00:00',
 '[{"time":"Feb 18, 9:00 AM","event":"Call","outcome":"Left voicemail"},{"time":"Feb 21, 4:00 PM","event":"Call","outcome":"Voicemail — mailbox full"}]'::jsonb,
 null, '[]'::jsonb,
 null, '+14155552003',
 '2026-02-16', '2026-02-16', '(g)24-48 hrs'),

-- ── Pasadena  (A. Garcia) — 3 leads in Feb 16–22 ───────────────────

('Luis Herrera', 'HL-2026-001304', 'Rented', false, true,
 'Pasadena', 'A. Garcia', 2, false, null, null,
 'Allstate', '45m', 'branch', null, null,
 '2026-02-18T11:15:00',
 '[{"time":"Feb 17, 2:00 PM","event":"Call","outcome":"Spoke — picking up tomorrow"},{"time":"Feb 18, 11:15 AM","event":"Call","outcome":"Converted"}]'::jsonb,
 '{}'::jsonb, '[]'::jsonb,
 'luis.herrera@example.com', '+14155552004',
 '2026-02-17', '2026-02-16', '(b)31min-1hr'),

('Karen Whitfield', 'HL-2026-001305', 'Cancelled', false, true,
 'Pasadena', 'A. Garcia', 4, false, null, null,
 'Farmers', '2h 10m', 'branch', '3d 6h', 'Customer no-show',
 '2026-02-20T15:30:00',
 '[{"time":"Feb 17, 9:00 AM","event":"Call","outcome":"Spoke — confirmed Friday"},{"time":"Feb 19, 10:00 AM","event":"SMS","outcome":"Sent reminder"},{"time":"Feb 20, 3:30 PM","event":"Call","outcome":"No show — unreachable"}]'::jsonb,
 '{"reason":"No-show after confirmation","notes":"Confirmed for Friday, never arrived","nextAction":"Close — no further action","followUpDate":null}'::jsonb,
 '[]'::jsonb,
 'karen.whitfield@example.com', '+14155552005',
 '2026-02-17', '2026-02-16', '(c)1-3 hrs'),

('Andre Mitchell', 'HL-2026-001306', 'Unused', false, false,
 'Pasadena', 'A. Garcia', 6, false, null, null,
 'Liberty Mutual', null, 'none', null, null,
 null,
 '[]'::jsonb, null, '[]'::jsonb,
 'andre.mitchell@example.com', null,
 '2026-02-16', '2026-02-16', 'NO CONTACT'),

-- ── Long Beach  (S. Lee) — 3 leads in Feb 16–22 ────────────────────

('Jasmine Crawford', 'HL-2026-001307', 'Rented', false, true,
 'Long Beach', 'S. Lee', 1, false, null, null,
 'USAA', '18m', 'branch', null, null,
 '2026-02-18T09:45:00',
 '[{"time":"Feb 18, 9:45 AM","event":"Call","outcome":"Converted"}]'::jsonb,
 '{}'::jsonb, '[]'::jsonb,
 'jasmine.crawford@example.com', '+14155552006',
 '2026-02-18', '2026-02-16', '(a)<30min'),

('Ronald Tate', 'HL-2026-001308', 'Cancelled', false, true,
 'Long Beach', 'S. Lee', 3, false, null, null,
 'Nationwide', '1h 50m', 'branch', '2d 4h', null,
 '2026-02-20T13:00:00',
 '[{"time":"Feb 18, 10:30 AM","event":"Call","outcome":"Spoke — checking schedule"},{"time":"Feb 20, 1:00 PM","event":"Call","outcome":"Customer chose competitor"}]'::jsonb,
 '{"reason":"Rented from competitor","notes":"Customer found lower daily rate at Enterprise","nextAction":"Close — no further action","followUpDate":null}'::jsonb,
 '[]'::jsonb,
 'ronald.tate@example.com', '+14155552007',
 '2026-02-18', '2026-02-16', '(b)31min-1hr'),

('Tamara Osei', 'HL-2026-001309', 'Unused', false, false,
 'Long Beach', 'S. Lee', 5, false, null, null,
 'Geico', null, 'none', null, null,
 null,
 '[]'::jsonb, null, '[]'::jsonb,
 null, '+14155552008',
 '2026-02-17', '2026-02-16', 'NO CONTACT');
