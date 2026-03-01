-- Wins & Learnings: BMs submit notable wins and learnings before the weekly compliance meeting.
-- The GM views all submissions from their branches in Meeting Prep and surface them in the presentation.

CREATE TABLE IF NOT EXISTS wins_learnings (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bm_name     text NOT NULL,
  branch      text NOT NULL,
  gm_name     text,
  content     text NOT NULL,
  week_of     date NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wins_learnings_gm     ON wins_learnings(gm_name);
CREATE INDEX IF NOT EXISTS idx_wins_learnings_branch ON wins_learnings(branch);
CREATE INDEX IF NOT EXISTS idx_wins_learnings_week   ON wins_learnings(week_of DESC);

-- RLS — match pattern used across all tables in this prototype
ALTER TABLE wins_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read"  ON wins_learnings FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON wins_learnings FOR ALL    USING (true);

-- Seed data — D. Williams zone (Eastern)
INSERT INTO wins_learnings (bm_name, branch, gm_name, content, week_of) VALUES
  ('M. Johnson', 'Santa Monica',  'D. Williams', 'Called State Farm leads within 15 minutes of reservation — converted 3 out of 4 this week. Immediate callback before they find alternatives is the key. — M. Johnson', '2026-02-16'),
  ('J. Smith',   'Downtown LA',   'D. Williams', 'Template SMS for Progressive leads cut our unreachables in half. Happy to share the template with other branches. — J. Smith',                                 '2026-02-16'),
  ('A. Garcia',  'Pasadena',      'D. Williams', 'Farmers leads are taking the longest to convert — averaging 3 contact attempts. Is there a zone-wide pattern? Would love guidance. — A. Garcia',            '2026-02-16'),
  ('T. Brown',   'Anaheim',       'D. Williams', 'Converted 2 previously unused leads by contacting the body shop directly rather than the customer. Will try this again next week. — T. Brown',              '2026-02-09'),
  ('S. Lee',     'Long Beach',    'D. Williams', 'Still struggling with Allstate cancellations — customers citing price difference vs competitors. Need guidance on retention messaging. — S. Lee',            '2026-02-09');
