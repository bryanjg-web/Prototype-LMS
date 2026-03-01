-- Hertz LMS - Add body_shop column (HLES column 23 'BODY SHOP')
-- Run after 019_task_priority_high_medium_low.sql

-- Add column
alter table leads add column if not exists body_shop text;

-- Indexes for grouping/filtering
create index if not exists idx_leads_body_shop on leads(body_shop);
create index if not exists idx_leads_insurance_company on leads(insurance_company);

-- Seed body_shop values for existing leads (sample body shop names)
-- Distributed across insurance companies for meaningful breakdown
update leads set body_shop = 'Smith Auto Body' where insurance_company = 'Geico' and body_shop is null;
update leads set body_shop = 'Downtown Collision Center' where insurance_company = 'State Farm' and body_shop is null;
update leads set body_shop = 'Metro Body Shop' where insurance_company = 'Allstate' and body_shop is null;
update leads set body_shop = 'Pacific Auto Repair' where insurance_company = 'Progressive' and body_shop is null;
update leads set body_shop = 'Valley Collision' where insurance_company = 'Farmers' and body_shop is null;
update leads set body_shop = 'Coast Auto Body' where insurance_company = 'USAA' and body_shop is null;
update leads set body_shop = 'Central Body Works' where insurance_company = 'Liberty Mutual' and body_shop is null;
update leads set body_shop = 'Westside Collision' where insurance_company = 'Nationwide' and body_shop is null;
update leads set body_shop = 'Coast Auto Body' where insurance_company = 'USAA' and body_shop is null;
-- Catch remaining leads with null insurance or other insurers
update leads set body_shop = 'General Auto Body' where body_shop is null;
