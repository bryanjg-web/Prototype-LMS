-- Hertz LMS - Seed 15 additional tasks to match mockData.js (tasks 4-18)
-- Run after 015_add_init_dt_final.sql
-- Uses reservation_id JOIN to resolve lead_id dynamically

INSERT INTO public.tasks (
  title, description, notes, due_date, status, priority,
  lead_id, source, created_by_name, assigned_to_name,
  notes_log, created_at, completed_at
)
SELECT
  t.title, t.description, t.notes, t.due_date::date, t.status, t.priority,
  l.id, t.source, t.created_by_name, t.assigned_to_name,
  t.notes_log::jsonb, t.created_at::timestamptz, t.completed_at::timestamptz
FROM (VALUES
  -- Santa Monica
  ('Verify Tom Bradley no-show documentation',
   'Customer confirmed pickup but never showed — verify branch notes match HLES',
   NULL, '2026-02-26', 'In Progress', 'High',
   'HL-2026-001242', 'gm_assigned', 'D. Williams', 'M. Johnson',
   '[{"time":"Feb 24, 10:15 AM","timestamp":1740402900000,"author":"M. Johnson","note":"Reviewed call log — confirmation was verbal only, no written follow-up sent."}]',
   '2026-02-23T08:00:00Z', NULL),

  ('Contact Maria Santos — overdue enrichment',
   '5-day-old cancellation with no enrichment. First contact was by HRD — branch needs to follow up.',
   NULL, '2026-02-25', 'Open', 'High',
   'HL-2026-001243', 'gm_assigned', 'D. Williams', 'Sarah Chen',
   '[]', '2026-02-22T11:00:00Z', NULL),

  ('Close out Chris Nguyen — competitor loss',
   'Customer found a better rate. Confirm no win-back opportunity and close.',
   'Spoke with customer — confirmed they signed with competitor. No further action.',
   '2026-02-24', 'Done', 'Medium',
   'HL-2026-001244', 'gm_assigned', 'D. Williams', 'Sarah Chen',
   '[{"time":"Feb 23, 3:00 PM","timestamp":1740348000000,"author":"Sarah Chen","note":"Spoke with customer — confirmed they signed with competitor. No further action."}]',
   '2026-02-22T16:00:00Z', '2026-02-23T15:05:00Z'),

  ('Follow up on Rachel Green callback',
   'Voicemail left — customer hasn''t called back in 5 days. Try alternate contact method.',
   NULL, '2026-02-28', 'Open', 'Medium',
   'HL-2026-001245', 'gm_assigned', 'D. Williams', 'M. Johnson',
   '[]', '2026-02-26T09:30:00Z', NULL),

  ('Confirm James Wilson Friday follow-up',
   'BM spoke with customer — follow-up scheduled for Friday. Verify outcome.',
   NULL, '2026-02-22', 'Done', 'High',
   'HL-2026-001246', 'gm_assigned', 'D. Williams', 'Sarah Chen',
   '[{"time":"Feb 21, 4:45 PM","timestamp":1740173100000,"author":"M. Johnson","note":"Called customer — confirmed rental for next week. Will finalize Friday."},{"time":"Feb 22, 9:00 AM","timestamp":1740229200000,"author":"Sarah Chen","note":"Monitoring — if no update by EOD Friday, will escalate."}]',
   '2026-02-21T10:00:00Z', '2026-02-22T17:00:00Z'),

  ('Auto: Sarah Chen — late first contact',
   'Translog shows first contact 4d 2h after reservation. Review and add notes.',
   NULL, '2026-02-27', 'Open', 'Medium',
   'HL-2026-001243', 'auto_translog', 'System', 'Sarah Chen',
   '[]', '2026-02-24T06:00:00Z', NULL),

  -- Long Beach
  ('Auto: Emily Davis — no activity detected',
   'Lead open 8 days with zero translog entries. Immediate action required.',
   NULL, '2026-02-24', 'Open', 'High',
   'HL-2026-001237', 'auto_other', 'System', 'T. Rodriguez',
   '[]', '2026-02-23T07:00:00Z', NULL),

  -- Downtown LA
  ('Re-attempt contact with John Martinez',
   '3 contact attempts with no success — try SMS or email before closing',
   NULL, '2026-02-28', 'In Progress', 'High',
   'HL-2026-001234', 'gm_assigned', 'D. Williams', 'J. Smith',
   '[{"time":"Feb 25, 11:00 AM","timestamp":1740488400000,"author":"J. Smith","note":"Sent SMS reminder to customer''s phone. Awaiting response."}]',
   '2026-02-24T15:00:00Z', NULL),

  ('Auto: John Martinez — enrichment stale',
   'Enrichment completed 10+ days ago with follow-up date passed. Review and update.',
   NULL, '2026-02-26', 'Open', 'Medium',
   'HL-2026-001234', 'auto_other', 'System', 'J. Smith',
   '[]', '2026-02-25T06:00:00Z', NULL),

  -- Pasadena
  ('Resolve Michael Torres enrichment mismatch',
   'Lead flagged — no BM comments despite cancelled status. Complete enrichment ASAP.',
   NULL, '2026-02-27', 'In Progress', 'High',
   'HL-2026-001236', 'gm_assigned', 'D. Williams', 'A. Garcia',
   '[{"time":"Feb 26, 9:30 AM","timestamp":1740570600000,"author":"A. Garcia","note":"Attempted to reach customer, line busy. Will retry this afternoon."}]',
   '2026-02-25T08:00:00Z', NULL),

  ('Auto: Michael Torres — late first contact flag',
   'First contact was 5d 2h after reservation and made by HRD, not branch. Document reason.',
   NULL, '2026-03-01', 'Open', 'Medium',
   'HL-2026-001236', 'auto_translog', 'System', 'A. Garcia',
   '[]', '2026-02-26T06:00:00Z', NULL),

  -- Anaheim
  ('Document Robert Kim conversion',
   'Quick conversion (30m first contact, same-day rental) — add success notes for best-practice reference.',
   'Called and converted same day. Customer was ready to pick up.',
   '2026-02-21', 'Done', 'Low',
   'HL-2026-001238', 'gm_assigned', 'D. Williams', 'T. Brown',
   '[{"time":"Feb 20, 11:30 AM","timestamp":1740055800000,"author":"T. Brown","note":"Called and converted same day. Customer was ready to pick up."}]',
   '2026-02-20T10:30:00Z', '2026-02-20T11:35:00Z'),

  -- Santa Monica (more)
  ('Auto: Lisa Wong — confirm rental completed',
   'Translog shows conversion but no post-rental documentation. Verify rental status.',
   NULL, '2026-02-25', 'Done', 'Low',
   'HL-2026-001239', 'auto_translog', 'System', 'M. Johnson',
   '[]', '2026-02-20T12:00:00Z', '2026-02-21T09:00:00Z'),

  ('Escalate David Park — insurance verification pending',
   'Rental completed but insurance documentation incomplete. Follow up with customer.',
   NULL, '2026-03-01', 'In Progress', 'Medium',
   'HL-2026-001240', 'gm_assigned', 'D. Williams', 'M. Johnson',
   '[{"time":"Feb 24, 2:00 PM","timestamp":1740412800000,"author":"M. Johnson","note":"Left voicemail requesting insurance card upload. Set 48h reminder."}]',
   '2026-02-24T09:00:00Z', NULL),

  ('Review Jennifer Adams quick-turn rental',
   'Fast conversion — 45m to first contact. Capture process notes for team training.',
   NULL, '2026-03-03', 'Open', 'Low',
   'HL-2026-001241', 'gm_assigned', 'D. Williams', 'Sarah Chen',
   '[]', '2026-02-27T14:00:00Z', NULL)

) AS t(title, description, notes, due_date, status, priority, res_id, source, created_by_name, assigned_to_name, notes_log, created_at, completed_at)
JOIN public.leads l ON l.reservation_id = t.res_id;
