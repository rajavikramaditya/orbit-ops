-- ============================================================================
-- ORBIT OPS — Complete PostgreSQL / Supabase Schema Migration
-- Brand: Orbit Media by Orbitcore (Orai, Uttar Pradesh, India)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & CUSTOM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'manager', 'team');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_status AS ENUM ('onboarding', 'active', 'paused', 'churned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE health_status AS ENUM ('green', 'amber', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_stage AS ENUM (
    'idea',
    'planned_for_shoot',
    'shot',
    'in_editing',
    'ready_for_approval',
    'approved',
    'scheduled',
    'posted',
    'revision_requested',
    'dropped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('P1', 'P2', 'P3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'waiting_on_client', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_channel AS ENUM ('call', 'whatsapp', 'meeting', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE triage_status AS ENUM ('new', 'triaged', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM (
    'brief_received',
    'working',
    'in_review',
    'revisions',
    'delivered',
    'paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_stage AS ENUM (
    'new_lead',
    'research',
    'proposal_sent',
    'follow_up',
    'negotiation',
    'won',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS & PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL DEFAULT 'Orbitcore',
  brand_name TEXT NOT NULL DEFAULT 'Orbit Media',
  display_header TEXT NOT NULL DEFAULT 'Orbit Media by Orbitcore',
  website TEXT DEFAULT 'orbitcore.in',
  city TEXT DEFAULT 'Orai',
  state TEXT DEFAULT 'Uttar Pradesh',
  country TEXT DEFAULT 'India',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'team',
  specialty TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 3. PACKAGE TEMPLATES & CLIENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS package_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  videos_per_cycle INTEGER NOT NULL DEFAULT 8,
  default_fee_paise BIGINT NOT NULL DEFAULT 0,
  other_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  official_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  wrong_spellings TEXT[] NOT NULL DEFAULT '{}',
  status client_status NOT NULL DEFAULT 'onboarding',
  engagement_type TEXT NOT NULL DEFAULT 'retainer', -- 'retainer' | 'one_off' | 'both'
  industry TEXT,
  city TEXT DEFAULT 'Orai',
  address TEXT,
  maps_url TEXT,
  gst_no TEXT,
  website TEXT,
  tagline TEXT,
  language_pref TEXT NOT NULL DEFAULT 'Hinglish', -- 'Hindi' | 'Hinglish' | 'English'
  voice_tone_notes TEXT,
  onboarded_on DATE,
  owner_id UUID REFERENCES profiles(id),
  health_override health_status,
  health_override_reason TEXT,
  health_override_until TIMESTAMPTZ,
  portal_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes TEXT,
  research_strengths TEXT,
  research_gaps TEXT,
  research_competitors TEXT,
  proposal_summary TEXT,
  growth_plan TEXT,
  monthly_plan TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'Instagram' | 'Facebook' | 'YouTube' | 'Google Business'
  handle TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'logo_png' | 'logo_svg' | 'color_palette' | 'font' | 'guidelines_pdf' | 'photo'
  title TEXT NOT NULL,
  file_path TEXT,
  hex_colours TEXT[] DEFAULT '{}',
  font_names TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS client_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  package_template_id UUID REFERENCES package_templates(id),
  package_name TEXT NOT NULL DEFAULT '8 videos / month',
  monthly_fee_paise BIGINT NOT NULL DEFAULT 0,
  videos_per_cycle INTEGER NOT NULL DEFAULT 8,
  other_deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  cycle_day INTEGER NOT NULL DEFAULT 1 CHECK (cycle_day >= 1 AND cycle_day <= 28),
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 4. SHOOTS & CONTENT PIPELINE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shoots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shoot_date DATE NOT NULL,
  start_time TEXT DEFAULT '10:00 AM',
  location TEXT NOT NULL,
  crew UUID[] NOT NULL DEFAULT '{}',
  equipment_notes TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned' | 'completed' | 'cancelled'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'reel', -- 'video' | 'reel' | 'poster' | 'carousel' | 'story_set' | 'ad_creative'
  title TEXT NOT NULL,
  script TEXT, -- Hindi / Hinglish / English hook & script notes
  reference_links TEXT[] DEFAULT '{}',
  stage content_stage NOT NULL DEFAULT 'idea',
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignee_id UUID REFERENCES profiles(id),
  shoot_id UUID REFERENCES shoots(id) ON DELETE SET NULL,
  planned_shoot_on DATE,
  due_on DATE,
  post_on DATE,
  platforms TEXT[] NOT NULL DEFAULT '{Instagram}',
  raw_url TEXT,
  final_url TEXT,
  caption TEXT,
  hashtags TEXT,
  feedback_notes TEXT,
  revision_count INTEGER NOT NULL DEFAULT 0,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shoot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shoot_id UUID NOT NULL REFERENCES shoots(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  shot_list TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 5. TASKS, REQUESTS, ONE-OFF PROJECTS & ONBOARDING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id),
  priority task_priority NOT NULL DEFAULT 'P2',
  due_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status task_status NOT NULL DEFAULT 'todo',
  recurrence TEXT, -- NULL | 'weekly' | 'monthly'
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_hours NUMERIC(4,1) DEFAULT 1.5,
  snoozed_until DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel request_channel NOT NULL DEFAULT 'call',
  body TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_by UUID REFERENCES profiles(id),
  priority task_priority DEFAULT 'P2',
  assignee_id UUID REFERENCES profiles(id),
  due_on DATE,
  triage_status triage_status NOT NULL DEFAULT 'new',
  converted_to_type TEXT, -- 'task' | 'content_item'
  converted_to_id UUID,
  attachments TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  price_paise BIGINT NOT NULL DEFAULT 0,
  deliverables_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision_count INTEGER NOT NULL DEFAULT 0,
  status project_status NOT NULL DEFAULT 'brief_received',
  assignee_id UUID REFERENCES profiles(id),
  due_on DATE,
  files TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  due_on DATE,
  done_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 6. SALES PIPELINE (OWNERS ONLY)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT DEFAULT 'Orai',
  industry TEXT,
  source TEXT NOT NULL DEFAULT 'outreach', -- 'referral' | 'outreach' | 'inbound' | 'social'
  referred_by_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_interest TEXT NOT NULL,
  estimated_value_paise BIGINT NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES profiles(id),
  stage lead_stage NOT NULL DEFAULT 'new_lead',
  lost_reason TEXT,
  next_follow_up_on DATE,
  follow_up_note TEXT,
  proposal_url TEXT,
  converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lead_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  weaknesses_and_gaps TEXT,
  competitor_findings TEXT,
  social_ad_audit TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 7. MONEY: INVOICES, QUOTATIONS & PAYMENTS (PAISE INTEGERS ONLY)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE, -- Format: OM-YYYY-NNN
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  subtotal_paise BIGINT NOT NULL DEFAULT 0,
  gst_amount_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'issued', -- 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_paise BIGINT NOT NULL DEFAULT 0,
  line_total_paise BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL UNIQUE, -- Format: OMQ-YYYY-NNN
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  gst_applicable BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_paise BIGINT NOT NULL DEFAULT 0,
  gst_amount_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sent', -- 'draft' | 'sent' | 'accepted' | 'declined'
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'UPI', -- 'UPI' | 'Bank Transfer (NEFT/IMPS)' | 'Cash' | 'Cheque'
  reference_no TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 8. DOCUMENTS, COMMENTS, ACTIVITY LOG, NOTIFICATIONS & SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'proposal' | 'brand_pdf' | 'invoice' | 'contract' | 'drive_link' | 'other'
  title TEXT NOT NULL,
  file_path_or_url TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'client' | 'content_item' | 'task' | 'request' | 'project' | 'lead'
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  summary TEXT,
  before_state JSONB,
  after_state JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app', -- 'in_app' | 'email' | 'whatsapp'
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL DEFAULT 'Orbitcore',
  brand_name TEXT NOT NULL DEFAULT 'Orbit Media',
  header_text TEXT NOT NULL DEFAULT 'Orbit Media by Orbitcore',
  registered_address TEXT NOT NULL DEFAULT 'Station Road, Civil Lines, Orai, Uttar Pradesh - 285001, India',
  gst_number TEXT NOT NULL DEFAULT '09AABCO1234F1Z5',
  default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  bank_name TEXT NOT NULL DEFAULT 'HDFC Bank, Orai Branch',
  bank_account_name TEXT NOT NULL DEFAULT 'Orbitcore',
  bank_account_number TEXT NOT NULL DEFAULT '50200078912345',
  bank_ifsc TEXT NOT NULL DEFAULT 'HDFC0001842',
  bank_upi_id TEXT NOT NULL DEFAULT 'orbitcore@hdfcbank',
  invoice_prefix TEXT NOT NULL DEFAULT 'OM',
  quotation_prefix TEXT NOT NULL DEFAULT 'OMQ',
  next_invoice_seq INTEGER NOT NULL DEFAULT 1,
  next_quotation_seq INTEGER NOT NULL DEFAULT 1,
  invoice_terms TEXT NOT NULL DEFAULT '1. All payments are due within 7 days of invoice date.\n2. Retainer fees are billed in advance on the cycle start day.\n3. Subject to Orai, Uttar Pradesh jurisdiction.',
  health_thresholds JSONB NOT NULL DEFAULT '{
    "green_max_inactive_days": 3,
    "amber_max_inactive_days": 6,
    "red_min_inactive_days": 7,
    "amber_behind_items": 1,
    "red_behind_items": 3,
    "approval_wait_days": 2,
    "overdue_red_days": 3,
    "request_sla_hours": 4,
    "weekly_edit_capacity": 18
  }'::jsonb,
  priority_weights JSONB NOT NULL DEFAULT '{
    "base_P1": 100,
    "base_P2": 50,
    "base_P3": 20,
    "due_today_bonus": 40,
    "overdue_per_day": 10,
    "overdue_max_bonus": 60,
    "client_red_bonus": 30,
    "approval_wait_bonus": 25,
    "scheduled_today_not_ready_bonus": 20,
    "today_shoot_bonus": 15
  }'::jsonb,
  working_days TEXT[] NOT NULL DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}',
  working_hours_start TEXT NOT NULL DEFAULT '10:00',
  working_hours_end TEXT NOT NULL DEFAULT '19:00',
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. INDEXES FOR FAST QUERIES (Section 7)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON clients(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients(last_activity_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_client_id ON content_items(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_assignee_id ON content_items(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_stage ON content_items(stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_due_on ON content_items(due_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_post_on ON content_items(post_on) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_on ON tasks(due_on) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requests_client_id ON requests(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_triage_status ON requests(triage_status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_due_on ON projects(due_on) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_client_id ON activity_log(client_id, at DESC);

-- ----------------------------------------------------------------------------
-- 10. AUTOMATIC ACTIVITY LOG & LAST_ACTIVITY_AT TRIGGER (Section 5.4 & 7)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_record_client_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_org_id UUID;
  v_actor_id UUID;
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created_' || TG_TABLE_NAME;
    v_org_id := NEW.organization_id;
    v_actor_id := NEW.created_by;
    IF TG_TABLE_NAME = 'clients' THEN
      v_client_id := NEW.id;
    ELSE
      v_client_id := NEW.client_id;
    END IF;

    INSERT INTO activity_log (organization_id, entity_type, entity_id, client_id, actor_id, action, before_state, after_state, at)
    VALUES (v_org_id, TG_TABLE_NAME, NEW.id, v_client_id, v_actor_id, v_action, NULL, to_jsonb(NEW), NOW());
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated_' || TG_TABLE_NAME;
    v_org_id := NEW.organization_id;
    v_actor_id := NEW.created_by;
    IF TG_TABLE_NAME = 'clients' THEN
      v_client_id := NEW.id;
    ELSE
      v_client_id := NEW.client_id;
    END IF;

    INSERT INTO activity_log (organization_id, entity_type, entity_id, client_id, actor_id, action, before_state, after_state, at)
    VALUES (v_org_id, TG_TABLE_NAME, NEW.id, v_client_id, v_actor_id, v_action, to_jsonb(OLD), to_jsonb(NEW), NOW());
  END IF;

  -- Automatically refresh clients.last_activity_at whenever anything changes for that client
  IF v_client_id IS NOT NULL AND TG_TABLE_NAME <> 'clients' THEN
    UPDATE clients
    SET last_activity_at = NOW(),
        updated_at = NOW()
    WHERE id = v_client_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_content_activity ON content_items;
CREATE TRIGGER trg_content_activity
AFTER INSERT OR UPDATE ON content_items
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_tasks_activity ON tasks;
CREATE TRIGGER trg_tasks_activity
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_requests_activity ON requests;
CREATE TRIGGER trg_requests_activity
AFTER INSERT OR UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_projects_activity ON projects;
CREATE TRIGGER trg_projects_activity
AFTER INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_payments_activity ON payments;
CREATE TRIGGER trg_payments_activity
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_comments_activity ON comments;
CREATE TRIGGER trg_comments_activity
AFTER INSERT OR UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

DROP TRIGGER IF EXISTS trg_documents_activity ON documents;
CREATE TRIGGER trg_documents_activity
AFTER INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION fn_record_client_activity();

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES (Section 4 & 7)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles & Organization: readable by all authenticated team members; editable by Owners
CREATE POLICY "Authenticated users read organizations" ON organizations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users read profiles" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners manage profiles" ON profiles
  FOR ALL USING (auth_user_role() = 'owner');

-- Clients: Owners and Managers see all; Team sees clients they have tasks/content assigned for or all active clients
CREATE POLICY "Owners and Managers full access to clients" ON clients
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "Team read assigned clients" ON clients
  FOR SELECT USING (
    auth_user_role() = 'team'
    AND deleted_at IS NULL
    AND (
      owner_id = auth_profile_id()
      OR EXISTS (SELECT 1 FROM content_items ci WHERE ci.client_id = clients.id AND ci.assignee_id = auth_profile_id())
      OR EXISTS (SELECT 1 FROM tasks t WHERE t.client_id = clients.id AND t.assignee_id = auth_profile_id())
    )
  );

-- Brand assets, contacts, socials: readable by all authenticated users, editable by Owner/Manager
CREATE POLICY "Team read brand assets" ON client_brand_assets
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Owner Manager manage brand assets" ON client_brand_assets
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "Team read client contacts" ON client_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Owner Manager manage client contacts" ON client_contacts
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

CREATE POLICY "Team read client socials" ON client_social_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);
CREATE POLICY "Owner Manager manage client socials" ON client_social_accounts
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

-- Content Items & Tasks: Team can view & update assigned items; Owner/Manager full access
CREATE POLICY "Read content items" ON content_items
  FOR SELECT USING (
    auth_user_role() IN ('owner', 'manager')
    OR assignee_id = auth_profile_id()
  );
CREATE POLICY "Update content items" ON content_items
  FOR ALL USING (
    auth_user_role() IN ('owner', 'manager')
    OR assignee_id = auth_profile_id()
  );

CREATE POLICY "Read tasks" ON tasks
  FOR SELECT USING (
    auth_user_role() IN ('owner', 'manager')
    OR assignee_id = auth_profile_id()
  );
CREATE POLICY "Manage tasks" ON tasks
  FOR ALL USING (
    auth_user_role() IN ('owner', 'manager')
    OR assignee_id = auth_profile_id()
  );

-- Sales Pipeline (Leads): STRICTLY Owner only (Section 4 & 6.8)
CREATE POLICY "Owners only access leads" ON leads
  FOR ALL USING (auth_user_role() = 'owner');
CREATE POLICY "Owners only access lead research" ON lead_research
  FOR ALL USING (auth_user_role() = 'owner');
CREATE POLICY "Owners only access lead activities" ON lead_activities
  FOR ALL USING (auth_user_role() = 'owner');

-- Money (Invoices, Quotations, Payments, Client Plans): STRICTLY Owner & Manager only (Team blocked at DB level)
CREATE POLICY "Owner Manager access invoices" ON invoices
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owner Manager access invoice items" ON invoice_items
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owner Manager access quotations" ON quotations
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owner Manager access payments" ON payments
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owner Manager access client plans" ON client_plans
  FOR ALL USING (auth_user_role() IN ('owner', 'manager'));

-- Settings & Audit Log: Owners manage settings and view full audit log
CREATE POLICY "Read settings" ON settings
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Owners update settings" ON settings
  FOR ALL USING (auth_user_role() = 'owner');

CREATE POLICY "Read activity log" ON activity_log
  FOR SELECT USING (auth_user_role() IN ('owner', 'manager'));
