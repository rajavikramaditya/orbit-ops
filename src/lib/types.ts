export type UserRole = "owner" | "manager" | "team";

export type ClientStatus = "onboarding" | "active" | "paused" | "churned";
export type HealthStatus = "green" | "amber" | "red";

export type ContentStage =
  | "idea"
  | "planned_for_shoot"
  | "shot"
  | "in_editing"
  | "ready_for_approval"
  | "approved"
  | "scheduled"
  | "posted"
  | "revision_requested"
  | "dropped";

export type ContentType =
  | "video"
  | "reel"
  | "poster"
  | "carousel"
  | "story_set"
  | "ad_creative";

export type TaskPriority = "P1" | "P2" | "P3";
export type TaskStatus = "todo" | "in_progress" | "waiting_on_client" | "done";

export type RequestChannel = "call" | "whatsapp" | "meeting" | "other";
export type TriageStatus = "new" | "triaged" | "in_progress" | "done";

export type ProjectStatus =
  | "brief_received"
  | "working"
  | "in_review"
  | "revisions"
  | "delivered"
  | "paid";

export type LeadStage =
  | "new_lead"
  | "research"
  | "proposal_sent"
  | "follow_up"
  | "negotiation"
  | "won"
  | "lost";

export interface TeamProfile {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  specialty: string;
  phone: string;
  active: boolean;
  twoFactorEnabled: boolean;
}

export interface PackageTemplate {
  id: string;
  name: string;
  videosPerCycle: number;
  defaultFeePaise: number;
  otherDeliverables: string[];
  description: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  designation: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  isPrimary: boolean;
}

export interface ClientSocialAccount {
  id: string;
  clientId: string;
  platform: "Instagram" | "Facebook" | "YouTube" | "Google Business" | "Website";
  handle: string;
  url?: string;
}

export interface ClientBrandAsset {
  id: string;
  clientId: string;
  type: "logo_png" | "logo_svg" | "color_palette" | "font" | "guidelines_pdf" | "photo";
  title: string;
  fileUrl?: string;
  hexColours?: string[];
  fontNames?: string[];
  notes?: string;
}

export interface ClientPlan {
  id: string;
  clientId: string;
  packageTemplateId?: string;
  packageName: string;
  monthlyFeePaise: number;
  videosPerCycle: number;
  otherDeliverables: string[];
  cycleDay: number; // 1..28 billing day
  startsOn: string; // YYYY-MM-DD
  endsOn?: string;
  gstApplicable: boolean;
  active: boolean;
}

export interface Client {
  id: string;
  organizationId: string;
  officialName: string;
  displayName: string;
  aliases: string[];
  wrongSpellings: string[];
  status: ClientStatus;
  engagementType: "retainer" | "one_off" | "both";
  industry: string;
  city: string;
  address?: string;
  mapsUrl?: string;
  gstNo?: string;
  website?: string;
  tagline?: string;
  languagePref: "Hindi" | "Hinglish" | "English";
  voiceToneNotes?: string;
  onboardedOn?: string; // YYYY-MM-DD
  ownerId: string;
  healthOverride?: HealthStatus;
  healthOverrideReason?: string;
  healthOverrideUntil?: string;
  portalToken: string;
  notes?: string;
  researchStrengths?: string;
  researchGaps?: string;
  researchCompetitors?: string;
  proposalSummary?: string;
  growthPlan?: string;
  monthlyPlan?: string;
  lastActivityAt: string; // ISO
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ContentItem {
  id: string;
  clientId: string;
  type: ContentType;
  title: string;
  script?: string;
  referenceLinks: string[];
  stage: ContentStage;
  stageChangedAt: string;
  assigneeId: string;
  shootId?: string;
  plannedShootOn?: string;
  dueOn?: string;
  postOn?: string;
  platforms: string[];
  rawUrl?: string;
  finalUrl?: string;
  caption?: string;
  hashtags?: string;
  feedbackNotes?: string;
  revisionCount: number;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ShootItem {
  id: string;
  shootId: string;
  clientId: string;
  contentItemId?: string;
  shotList: string;
}

export interface ShootDay {
  id: string;
  shootDate: string; // YYYY-MM-DD
  startTime: string;
  location: string;
  crew: string[]; // profile IDs
  equipmentNotes?: string;
  notes?: string;
  status: "planned" | "completed" | "cancelled";
  items: ShootItem[];
  createdAt: string;
  deletedAt?: string | null;
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskItem {
  id: string;
  clientId?: string;
  contentItemId?: string;
  title: string;
  description?: string;
  assigneeId: string;
  priority: TaskPriority;
  dueOn: string; // YYYY-MM-DD
  status: TaskStatus;
  recurrence?: "weekly" | "monthly" | null;
  checklist: TaskChecklistItem[];
  estimatedHours: number;
  snoozedUntil?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ClientRequest {
  id: string;
  clientId: string;
  channel: RequestChannel;
  body: string;
  receivedAt: string; // ISO
  loggedBy: string;
  priority: TaskPriority;
  assigneeId?: string;
  dueOn?: string;
  triageStatus: TriageStatus;
  convertedToType?: "task" | "content_item";
  convertedToId?: string;
  attachments: string[];
  createdAt: string;
  deletedAt?: string | null;
}

export interface OneOffProject {
  id: string;
  clientId: string;
  name: string;
  scope: string;
  pricePaise: number;
  deliverablesChecklist: TaskChecklistItem[];
  revisionCount: number;
  status: ProjectStatus;
  assigneeId: string;
  dueOn: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface OnboardingStep {
  id: string;
  clientId: string;
  stepOrder: number;
  step: string;
  ownerId: string;
  dueOn?: string;
  doneAt?: string;
}

export interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  city: string;
  industry: string;
  source: "referral" | "outreach" | "inbound" | "social";
  referredByClientId?: string;
  serviceInterest: string;
  estimatedValuePaise: number;
  ownerId: string;
  stage: LeadStage;
  lostReason?: string;
  nextFollowUpOn?: string;
  followUpNote?: string;
  proposalUrl?: string;
  weaknessesAndGaps?: string;
  competitorFindings?: string;
  socialAdAudit?: string;
  convertedClientId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string; // OM-YYYY-NNN
  issueDate: string;
  dueDate: string;
  gstApplicable: boolean;
  gstRatePercent: number;
  items: InvoiceLineItem[];
  subtotalPaise: number;
  gstAmountPaise: number;
  totalPaise: number;
  notes?: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "overdue";
  createdAt: string;
  deletedAt?: string | null;
}

export interface Quotation {
  id: string;
  clientId?: string;
  leadId?: string;
  recipientName: string;
  quotationNumber: string; // OMQ-YYYY-NNN
  issueDate: string;
  validUntil: string;
  gstApplicable: boolean;
  gstRatePercent: number;
  items: InvoiceLineItem[];
  subtotalPaise: number;
  gstAmountPaise: number;
  totalPaise: number;
  status: "draft" | "sent" | "accepted" | "declined";
  notes?: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface PaymentRecord {
  id: string;
  clientId: string;
  invoiceId?: string;
  projectId?: string;
  amountPaise: number;
  paidOn: string;
  method: "UPI" | "Bank Transfer (NEFT/IMPS)" | "Cash" | "Cheque";
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  kind: "proposal" | "brand_pdf" | "invoice" | "contract" | "drive_link" | "other";
  title: string;
  filePathOrUrl: string;
  version: number;
  createdBy: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface CommentItem {
  id: string;
  entityType: "client" | "content_item" | "task" | "request" | "project" | "lead";
  entityId: string;
  clientId?: string;
  body: string;
  mentions: string[];
  createdBy: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ActivityLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  clientId?: string;
  actorId: string;
  action: string;
  summary: string;
  at: string; // ISO
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  channel: "in_app" | "email" | "whatsapp";
  linkUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface HealthThresholds {
  greenMaxInactiveDays: number;
  amberMaxInactiveDays: number;
  redMinInactiveDays: number;
  amberBehindItems: number;
  redBehindItems: number;
  approvalWaitDays: number;
  overdueRedDays: number;
  requestSlaHours: number;
  weeklyEditCapacity: number;
}

export interface PriorityWeights {
  baseP1: number;
  baseP2: number;
  baseP3: number;
  dueTodayBonus: number;
  overduePerDay: number;
  overdueMaxBonus: number;
  clientRedBonus: number;
  approvalWaitBonus: number;
  scheduledTodayNotReadyBonus: number;
  todayShootBonus: number;
}

export interface AgencySettings {
  legalName: string;
  brandName: string;
  headerText: string;
  website: string;
  registeredAddress: string;
  city: string;
  state: string;
  gstNumber: string;
  defaultGstRate: number;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankUpiId: string;
  invoicePrefix: string;
  quotationPrefix: string;
  nextInvoiceSeq: number;
  nextQuotationSeq: number;
  invoiceTerms: string;
  healthThresholds: HealthThresholds;
  priorityWeights: PriorityWeights;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
}
