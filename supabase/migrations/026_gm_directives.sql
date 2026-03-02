-- GM Directives: append-only history of directives given by GMs to BMs on specific leads.
-- The latest directive is also stored on leads.gm_directive for quick lookups/badges.

-- Drop existing table (without due_date) so it can be recreated with the full schema
DROP TABLE IF EXISTS public.gm_directives CASCADE;

CREATE TABLE public.gm_directives (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id       bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  directive_text text NOT NULL,
  priority      text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  due_date      date,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gm_directives_lead_id ON public.gm_directives(lead_id);
CREATE INDEX IF NOT EXISTS idx_gm_directives_created_at ON public.gm_directives(created_at DESC);

ALTER TABLE public.gm_directives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read gm_directives"
  ON public.gm_directives FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert gm_directives"
  ON public.gm_directives FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
