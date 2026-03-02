-- Add persistent user ID columns to org_mapping.
-- These survive HLES re-uploads (which overwrite the text gm/bm columns).
-- The upload process only touches gm/bm/am/zone text fields;
-- gm_user_id and bm_user_id are set manually via admin or seed scripts.

ALTER TABLE org_mapping ADD COLUMN IF NOT EXISTS gm_user_id uuid REFERENCES auth.users(id);
ALTER TABLE org_mapping ADD COLUMN IF NOT EXISTS bm_user_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_org_mapping_gm_user_id ON org_mapping(gm_user_id);
CREATE INDEX IF NOT EXISTS idx_org_mapping_bm_user_id ON org_mapping(bm_user_id);
