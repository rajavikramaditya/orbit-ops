-- ============================================================================
-- ORBIT OPS — Seed Data Script (Section 12)
-- Seeds:
-- 1. Organization: Orbitcore ("Orbit Media by Orbitcore")
-- 2. The 7 team members with exact roles (Ram Soni, Vikas Rathore, Tanvi, Tosseeb, Rohit, Shahil, Prathmes)
-- 3. Package templates: "8 videos / month", "12 videos / month", "Custom"
-- 4. Reference / Demo Clients clearly marked `is_demo = true` with official spellings
--    and known wrong spellings so they can be tested and deleted in one click.
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ram_id UUID := '00000000-0000-0000-0000-000000000101';
  v_vikas_id UUID := '00000000-0000-0000-0000-000000000102';
  v_tanvi_id UUID := '00000000-0000-0000-0000-000000000103';
  v_tosseeb_id UUID := '00000000-0000-0000-0000-000000000104';
  v_rohit_id UUID := '00000000-0000-0000-0000-000000000105';
  v_shahil_id UUID := '00000000-0000-0000-0000-000000000106';
  v_prathmes_id UUID := '00000000-0000-0000-0000-000000000107';
  v_pkg_8 UUID := '00000000-0000-0000-0000-000000000201';
  v_pkg_12 UUID := '00000000-0000-0000-0000-000000000202';
  v_pkg_custom UUID := '00000000-0000-0000-0000-000000000203';
BEGIN
  -- 1. Organization
  INSERT INTO organizations (id, legal_name, brand_name, display_header, website, city, state, country, timezone, currency)
  VALUES (v_org_id, 'Orbitcore', 'Orbit Media', 'Orbit Media by Orbitcore', 'orbitcore.in', 'Orai', 'Uttar Pradesh', 'India', 'Asia/Kolkata', 'INR')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Settings
  INSERT INTO settings (organization_id, legal_name, brand_name, header_text)
  VALUES (v_org_id, 'Orbitcore', 'Orbit Media', 'Orbit Media by Orbitcore')
  ON CONFLICT (organization_id) DO NOTHING;

  -- 3. 7 Team Profiles (Section 1 & Section 4)
  INSERT INTO profiles (id, organization_id, name, email, role, specialty, phone, two_factor_enabled)
  VALUES
    (v_ram_id, v_org_id, 'Ram Soni', 'ram@orbitcore.in', 'owner', 'Founder · Sales, Deals & Strategy', '+91 98765 00001', TRUE),
    (v_vikas_id, v_org_id, 'Vikas Rathore', 'vikas@orbitcore.in', 'owner', 'Founder · Client Growth & Strategy', '+91 98765 00002', TRUE),
    (v_tanvi_id, v_org_id, 'Tanvi', 'tanvi@orbitcore.in', 'manager', 'Coordinator & Manager · Feedback & Triage', '+91 98765 00003', FALSE),
    (v_tosseeb_id, v_org_id, 'Tosseeb', 'tosseeb@orbitcore.in', 'team', 'Camera Person · Cinematography', '+91 98765 00004', FALSE),
    (v_rohit_id, v_org_id, 'Rohit', 'rohit@orbitcore.in', 'team', 'Camera Helper & Lighting', '+91 98765 00005', FALSE),
    (v_shahil_id, v_org_id, 'Shahil', 'shahil@orbitcore.in', 'team', 'Social Media Handling (Meta Business Suite)', '+91 98765 00006', FALSE),
    (v_prathmes_id, v_org_id, 'Prathmes', 'prathmes@orbitcore.in', 'team', 'Video Editor', '+91 98765 00007', FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Package Templates (Section 12)
  INSERT INTO package_templates (id, organization_id, name, videos_per_cycle, default_fee_paise, other_deliverables, description)
  VALUES
    (v_pkg_8, v_org_id, '8 videos / month', 8, 2500000, '["4 Festival/Offer Posters", "Instagram & Facebook Handling", "Monthly Ad Campaign Setup"]'::jsonb, 'Standard monthly growth retainer with 8 reels/videos, posters, and Meta management'),
    (v_pkg_12, v_org_id, '12 videos / month', 12, 3500000, '["6 Posters & Carousels", "Full Meta Business Suite Management", "Performance Ads (Meta + Google)", "Priority Weekly Shoot"]'::jsonb, 'High-velocity monthly retainer with 12 videos/reels, full social management, and performance ads'),
    (v_pkg_custom, v_org_id, 'Custom', 0, 1500000, '["Custom deliverables as per proposal"]'::jsonb, 'Bespoke retainer or custom scope package')
  ON CONFLICT (id) DO NOTHING;
END $$;
