import {
  ActivityLogEntry,
  AgencySettings,
  Client,
  ClientBrandAsset,
  ClientContact,
  ClientDocument,
  ClientPlan,
  ClientRequest,
  ClientSocialAccount,
  CommentItem,
  ContentItem,
  Invoice,
  Lead,
  NotificationItem,
  OnboardingStep,
  OneOffProject,
  PackageTemplate,
  PaymentRecord,
  Quotation,
  ShootDay,
  TaskItem,
  TeamProfile,
} from "./types";
import { DEFAULT_HEALTH_THRESHOLDS, DEFAULT_PRIORITY_WEIGHTS } from "./business-rules";

export const ORG_ID = "00000000-0000-0000-0000-000000000001";

export const TEAM: TeamProfile[] = [
  { id: "u-ram", organizationId: ORG_ID, name: "Ram Soni", email: "ram@orbitcore.in", role: "owner", specialty: "Founder · Sales, deals & strategy", phone: "+91 98765 00001", active: true, twoFactorEnabled: true },
  { id: "u-vikas", organizationId: ORG_ID, name: "Vikas Rathore", email: "vikas@orbitcore.in", role: "owner", specialty: "Founder · Client growth & strategy", phone: "+91 98765 00002", active: true, twoFactorEnabled: true },
  { id: "u-tanvi", organizationId: ORG_ID, name: "Tanvi", email: "tanvi@orbitcore.in", role: "manager", specialty: "Coordinator & Manager · Feedback & triage", phone: "+91 98765 00003", active: true, twoFactorEnabled: false },
  { id: "u-tosseeb", organizationId: ORG_ID, name: "Tosseeb", email: "tosseeb@orbitcore.in", role: "team", specialty: "Camera person", phone: "+91 98765 00004", active: true, twoFactorEnabled: false },
  { id: "u-rohit", organizationId: ORG_ID, name: "Rohit", email: "rohit@orbitcore.in", role: "team", specialty: "Camera helper & lighting", phone: "+91 98765 00005", active: true, twoFactorEnabled: false },
  { id: "u-shahil", organizationId: ORG_ID, name: "Shahil", email: "shahil@orbitcore.in", role: "team", specialty: "Social media (Meta Business Suite)", phone: "+91 98765 00006", active: true, twoFactorEnabled: false },
  { id: "u-prathmes", organizationId: ORG_ID, name: "Prathmes", email: "prathmes@orbitcore.in", role: "team", specialty: "Video editor", phone: "+91 98765 00007", active: true, twoFactorEnabled: false },
];

export const DEFAULT_ASSIGNEE_BY_STAGE: Record<string, string> = {
  idea: "u-tanvi",
  planned_for_shoot: "u-tosseeb",
  shot: "u-prathmes",
  in_editing: "u-prathmes",
  ready_for_approval: "u-tanvi",
  revision_requested: "u-prathmes",
  approved: "u-shahil",
  scheduled: "u-shahil",
  posted: "u-shahil",
  dropped: "u-tanvi",
};

export const PACKAGES: PackageTemplate[] = [
  { id: "pkg-8", name: "8 videos / month", videosPerCycle: 8, defaultFeePaise: 2500000, otherDeliverables: ["4 posters", "Instagram & Facebook handling", "Monthly ad setup"], description: "Standard growth retainer" },
  { id: "pkg-12", name: "12 videos / month", videosPerCycle: 12, defaultFeePaise: 3500000, otherDeliverables: ["6 posters/carousels", "Full Meta Business Suite management", "Performance ads (Meta + Google)"], description: "High-velocity retainer" },
  { id: "pkg-custom", name: "Custom", videosPerCycle: 0, defaultFeePaise: 1500000, otherDeliverables: ["As per proposal"], description: "Bespoke scope" },
];

export const DEFAULT_SETTINGS: AgencySettings = {
  legalName: "Orbitcore",
  brandName: "Orbit Media",
  headerText: "Orbit Media by Orbitcore",
  website: "orbitcore.in",
  registeredAddress: "Station Road, Civil Lines, Orai, Uttar Pradesh – 285001, India",
  city: "Orai",
  state: "Uttar Pradesh",
  gstNumber: "09AABCO1234F1Z5",
  defaultGstRate: 18,
  bankName: "HDFC Bank, Orai Branch",
  bankAccountName: "Orbitcore",
  bankAccountNumber: "50200078912345",
  bankIfsc: "HDFC0001842",
  bankUpiId: "orbitcore@hdfcbank",
  invoicePrefix: "OM",
  quotationPrefix: "OMQ",
  nextInvoiceSeq: 9,
  nextQuotationSeq: 4,
  invoiceTerms:
    "1. Payment due within 7 days of invoice date.\n2. Retainer fees are billed in advance on the cycle start day.\n3. Subject to Orai, Uttar Pradesh jurisdiction.",
  healthThresholds: DEFAULT_HEALTH_THRESHOLDS,
  priorityWeights: DEFAULT_PRIORITY_WEIGHTS,
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  workingHoursStart: "10:00",
  workingHoursEnd: "19:00",
};

export const ONBOARDING_TEMPLATE: { step: string; ownerId: string; offsetDays: number }[] = [
  { step: "Deal confirmed", ownerId: "u-ram", offsetDays: 0 },
  { step: "Package and fee recorded", ownerId: "u-ram", offsetDays: 1 },
  { step: "Profile completeness items collected", ownerId: "u-tanvi", offsetDays: 3 },
  { step: "Brand assets received", ownerId: "u-tanvi", offsetDays: 4 },
  { step: "Kickoff call done", ownerId: "u-vikas", offsetDays: 5 },
  { step: "Growth plan shared", ownerId: "u-vikas", offsetDays: 7 },
  { step: "First shoot scheduled", ownerId: "u-tanvi", offsetDays: 8 },
  { step: "First video posted", ownerId: "u-shahil", offsetDays: 14 },
  { step: "Payment received", ownerId: "u-ram", offsetDays: 7 },
];

// ---------------------------------------------------------------------------
// Date helpers: build demo data relative to "now" so Today screen is always alive
// ---------------------------------------------------------------------------
function iso(daysOffset: number, hour = 11): string {
  const d = new Date();
  d.setUTCHours(hour - 5, 30, 0, 0); // ~IST hour
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString();
}
function ymd(daysOffset: number): string {
  return iso(daysOffset).slice(0, 10);
}
function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

export interface DemoDataset {
  clients: Client[];
  contacts: ClientContact[];
  socials: ClientSocialAccount[];
  assets: ClientBrandAsset[];
  plans: ClientPlan[];
  content: ContentItem[];
  tasks: TaskItem[];
  requests: ClientRequest[];
  projects: OneOffProject[];
  shoots: ShootDay[];
  onboarding: OnboardingStep[];
  leads: Lead[];
  invoices: Invoice[];
  quotations: Quotation[];
  payments: PaymentRecord[];
  documents: ClientDocument[];
  comments: CommentItem[];
  activity: ActivityLogEntry[];
  notifications: NotificationItem[];
}

/**
 * Demo clients use the real reference list of official spellings from the brief (Section 12),
 * but ALL other details (fees, contacts, content) are placeholders. Every row is `isDemo: true`
 * and can be removed in one click from Settings → "Delete all demo data".
 */
export function buildDemoDataset(): DemoDataset {
  const now = iso(0);

  const clientDefs: Array<Partial<Client> & { id: string; officialName: string; displayName: string; wrongSpellings: string[]; industry: string; lastActivityDays: number; status: Client["status"]; ownerId: string; onboardedDays: number; engagementType: Client["engagementType"] }> = [
    { id: "c-maa-sharda", officialName: "Maa Sharda Jewellers", displayName: "Maa Sharda Jewellers", aliases: ["MSJ", "Sharda Jewellers"], wrongSpellings: ["Ma Sharda Jewellers", "Maa Sharda Jewelers", "Maa Sharda Jwellers"], industry: "Jewellery showroom", lastActivityDays: 1, status: "active", ownerId: "u-ram", onboardedDays: -140, engagementType: "retainer", languagePref: "Hinglish", tagline: "Vishwas ki chamak, peedhiyon se", city: "Orai", address: "Sadar Bazar, Orai", mapsUrl: "https://maps.google.com/?q=Maa+Sharda+Jewellers+Orai", voiceToneNotes: "Warm, family-oriented, festive. Avoid over-promising discounts." },
    { id: "c-haven", officialName: "Haven Solutions", displayName: "Haven Solutions", aliases: ["Jagannath Modular Furniture Door"], wrongSpellings: ["Heaven Solutions", "Hevan Solutions"], industry: "Furniture & interiors", lastActivityDays: 5, status: "active", ownerId: "u-vikas", onboardedDays: -95, engagementType: "retainer", languagePref: "Hinglish", tagline: "Modular furniture, modern homes", city: "Orai", address: "Kalpi Road, Orai", voiceToneNotes: "Premium, clean, aspirational." },
    { id: "c-five-brothers", officialName: "Five Brothers", displayName: "Five Brothers", aliases: ["5 Brothers"], wrongSpellings: ["Five Brother", "Fiv Brothers"], industry: "Showroom", lastActivityDays: 0, status: "active", ownerId: "u-ram", onboardedDays: -60, engagementType: "retainer", languagePref: "Hindi", city: "Orai", address: "Jhansi Road, Orai", mapsUrl: "https://maps.google.com/?q=Five+Brothers+Orai" },
    { id: "c-devolia", officialName: "Devolia Resort", displayName: "Devolia Resort", aliases: [], wrongSpellings: ["Divoliya Resort", "Devoliya Resort", "Divolia Resort"], industry: "Resort & hospitality", lastActivityDays: 9, status: "active", ownerId: "u-vikas", onboardedDays: -210, engagementType: "retainer", languagePref: "Hinglish", tagline: "Celebrate in the lap of nature", city: "Orai", mapsUrl: "https://maps.google.com/?q=Devolia+Resort" },
    { id: "c-purwar", officialName: "Purwar Electricals", displayName: "Purwar Electricals (Havells Galaxy)", aliases: ["Havells Galaxy Orai"], wrongSpellings: ["Purvar Electricals", "Purwar Electrical"], industry: "Electricals showroom", lastActivityDays: 3, status: "active", ownerId: "u-ram", onboardedDays: -45, engagementType: "retainer", languagePref: "Hindi", city: "Orai", address: "Station Road, Orai", mapsUrl: "https://maps.google.com/?q=Purwar+Electricals+Orai" },
    { id: "c-hindustan", officialName: "Hindustan Motors", displayName: "Hindustan Motors", aliases: [], wrongSpellings: ["Hindusthan Motors", "Hindustan Motor"], industry: "Dealership", lastActivityDays: 12, status: "paused", ownerId: "u-vikas", onboardedDays: -300, engagementType: "retainer", languagePref: "Hindi", city: "Orai" },
    { id: "c-amrit", officialName: "Amrit Design Infra", displayName: "Amrit Design Infra", aliases: ["ADI"], wrongSpellings: ["Amrit Designs Infra", "Amrit Design Infa"], industry: "Interiors & construction", lastActivityDays: 2, status: "onboarding", ownerId: "u-ram", onboardedDays: -6, engagementType: "both", languagePref: "English", city: "Orai" },
  ];

  const clients: Client[] = clientDefs.map((d) => ({
    organizationId: ORG_ID,
    aliases: [],
    city: "Orai",
    languagePref: "Hinglish",
    portalToken: `demo-${d.id}`,
    isDemo: true,
    createdAt: iso(d.onboardedDays),
    updatedAt: iso(-d.lastActivityDays),
    lastActivityAt: iso(-d.lastActivityDays),
    onboardedOn: ymd(d.onboardedDays),
    deletedAt: null,
    ...d,
  })) as Client[];

  const contacts: ClientContact[] = [
    { id: "ct-1", clientId: "c-maa-sharda", name: "Sharma ji", designation: "Owner", phone: "+91 90000 11111", whatsapp: "+91 90000 11111", isPrimary: true },
    { id: "ct-2", clientId: "c-haven", name: "Jagannath Verma", designation: "Proprietor", phone: "+91 90000 22222", isPrimary: true },
    { id: "ct-3", clientId: "c-five-brothers", name: "Imran Bhai", designation: "Partner", phone: "+91 90000 33333", isPrimary: true },
    { id: "ct-4", clientId: "c-devolia", name: "Mr. Devolia", designation: "Director", phone: "+91 90000 44444", isPrimary: true },
    { id: "ct-5", clientId: "c-purwar", name: "Purwar ji", designation: "Owner", phone: "+91 90000 55555", isPrimary: true },
    { id: "ct-6", clientId: "c-hindustan", name: "Sales Manager", designation: "Manager", phone: "+91 90000 66666", isPrimary: true },
  ];

  const socials: ClientSocialAccount[] = [
    { id: "so-1", clientId: "c-maa-sharda", platform: "Instagram", handle: "@maashardajewellers", url: "https://instagram.com/maashardajewellers" },
    { id: "so-2", clientId: "c-maa-sharda", platform: "Facebook", handle: "Maa Sharda Jewellers Orai" },
    { id: "so-3", clientId: "c-haven", platform: "Instagram", handle: "@havensolutions.orai" },
    { id: "so-4", clientId: "c-five-brothers", platform: "Instagram", handle: "@fivebrothers.orai" },
    { id: "so-5", clientId: "c-devolia", platform: "Instagram", handle: "@devoliaresort" },
    { id: "so-6", clientId: "c-purwar", platform: "Facebook", handle: "Purwar Electricals Havells Galaxy" },
  ];

  const assets: ClientBrandAsset[] = [
    { id: "as-1", clientId: "c-maa-sharda", type: "logo_png", title: "Logo (transparent PNG)", fileUrl: "https://drive.google.com/demo/msj-logo.png" },
    { id: "as-2", clientId: "c-maa-sharda", type: "color_palette", title: "Brand colours", hexColours: ["#8B0000", "#D4AF37", "#FFFFFF"] },
    { id: "as-3", clientId: "c-maa-sharda", type: "font", title: "Fonts", fontNames: ["Playfair Display", "Noto Sans Devanagari"] },
    { id: "as-4", clientId: "c-haven", type: "logo_svg", title: "Logo (SVG)", fileUrl: "https://drive.google.com/demo/haven-logo.svg" },
    { id: "as-5", clientId: "c-haven", type: "color_palette", title: "Brand colours", hexColours: ["#1F2937", "#C8A96A"] },
    { id: "as-6", clientId: "c-five-brothers", type: "logo_png", title: "Logo PNG", fileUrl: "https://drive.google.com/demo/fb-logo.png" },
    { id: "as-7", clientId: "c-devolia", type: "logo_png", title: "Logo PNG", fileUrl: "https://drive.google.com/demo/devolia-logo.png" },
    { id: "as-8", clientId: "c-devolia", type: "guidelines_pdf", title: "Brand guidelines v1", fileUrl: "https://drive.google.com/demo/devolia-brand.pdf" },
    { id: "as-9", clientId: "c-purwar", type: "logo_png", title: "Havells Galaxy co-brand logo", fileUrl: "https://drive.google.com/demo/purwar.png" },
  ];

  const plans: ClientPlan[] = [
    { id: "pl-1", clientId: "c-maa-sharda", packageTemplateId: "pkg-12", packageName: "12 videos / month", monthlyFeePaise: 3500000, videosPerCycle: 12, otherDeliverables: ["6 posters", "Meta management", "Ads"], cycleDay: 12, startsOn: ymd(-140), gstApplicable: true, active: true },
    { id: "pl-2", clientId: "c-haven", packageTemplateId: "pkg-8", packageName: "8 videos / month", monthlyFeePaise: 2500000, videosPerCycle: 8, otherDeliverables: ["4 posters", "Meta management"], cycleDay: 5, startsOn: ymd(-95), gstApplicable: true, active: true },
    { id: "pl-3", clientId: "c-five-brothers", packageTemplateId: "pkg-8", packageName: "8 videos / month", monthlyFeePaise: 2200000, videosPerCycle: 8, otherDeliverables: ["4 posters"], cycleDay: 1, startsOn: ymd(-60), gstApplicable: false, active: true },
    { id: "pl-4", clientId: "c-devolia", packageTemplateId: "pkg-12", packageName: "12 videos / month", monthlyFeePaise: 4000000, videosPerCycle: 12, otherDeliverables: ["6 posters", "Ads", "Google Business"], cycleDay: 20, startsOn: ymd(-210), gstApplicable: true, active: true },
    { id: "pl-5", clientId: "c-purwar", packageTemplateId: "pkg-8", packageName: "8 videos / month", monthlyFeePaise: 2500000, videosPerCycle: 8, otherDeliverables: ["4 posters", "Meta management"], cycleDay: 15, startsOn: ymd(-45), gstApplicable: true, active: true },
    { id: "pl-6", clientId: "c-hindustan", packageTemplateId: "pkg-8", packageName: "8 videos / month", monthlyFeePaise: 3000000, videosPerCycle: 8, otherDeliverables: [], cycleDay: 1, startsOn: ymd(-300), gstApplicable: true, active: false },
  ];

  // Content items ---------------------------------------------------------
  const content: ContentItem[] = [];
  let n = 1;
  const push = (c: Partial<ContentItem> & { clientId: string; title: string; stage: ContentItem["stage"] }) => {
    const stageChanged = c.stageChangedAt ?? iso(-1);
    content.push({
      id: uid("ci", n++),
      type: "reel",
      referenceLinks: [],
      platforms: ["Instagram", "Facebook"],
      revisionCount: 0,
      assigneeId: DEFAULT_ASSIGNEE_BY_STAGE[c.stage],
      stageChangedAt: stageChanged,
      createdAt: iso(-10),
      updatedAt: stageChanged,
      deletedAt: null,
      ...c,
    } as ContentItem);
  };

  // Maa Sharda — healthy, well along in cycle
  for (let i = 0; i < 6; i++) push({ clientId: "c-maa-sharda", title: `Diwali collection reel ${i + 1}`, stage: "posted", postedAt: iso(-12 + i * 2), postOn: ymd(-12 + i * 2), script: "Hook: 'Is Diwali, chamak sirf diyon ki nahi…' — showcase new kundan set" });
  push({ clientId: "c-maa-sharda", title: "Dhanteras offer announcement", stage: "scheduled", postOn: ymd(1), caption: "Dhanteras par sona kharidne ka shubh muhurat ✨", hashtags: "#Dhanteras #MaaShardaJewellers #Orai" });
  push({ clientId: "c-maa-sharda", title: "Bridal set showcase", stage: "ready_for_approval", stageChangedAt: iso(-3), dueOn: ymd(0) });
  push({ clientId: "c-maa-sharda", title: "Customer testimonial – Gupta family", stage: "in_editing", dueOn: ymd(2), rawUrl: "https://drive.google.com/demo/msj-raw-1" });
  push({ clientId: "c-maa-sharda", title: "Gold rate explainer (Hindi)", stage: "planned_for_shoot", plannedShootOn: ymd(3), script: "सोने का भाव कैसे तय होता है? 60-sec explainer" });

  // Haven — slightly behind, approval waiting
  for (let i = 0; i < 3; i++) push({ clientId: "c-haven", title: `Modular kitchen walkthrough ${i + 1}`, stage: "posted", postedAt: iso(-20 + i * 4), postOn: ymd(-20 + i * 4) });
  push({ clientId: "c-haven", title: "Wardrobe design reel", stage: "ready_for_approval", stageChangedAt: iso(-4), dueOn: ymd(-1) });
  push({ clientId: "c-haven", title: "Before/After living room", stage: "in_editing", dueOn: ymd(1) });
  push({ clientId: "c-haven", title: "Festive offer poster", type: "poster", stage: "idea", dueOn: ymd(4) });

  // Five Brothers — active, today's shoot
  for (let i = 0; i < 2; i++) push({ clientId: "c-five-brothers", title: `New arrivals reel ${i + 1}`, stage: "posted", postedAt: iso(-8 + i * 3), postOn: ymd(-8 + i * 3) });
  push({ clientId: "c-five-brothers", title: "Owner intro – 'Humari kahani'", stage: "planned_for_shoot", plannedShootOn: ymd(0), shootId: "sh-today" });
  push({ clientId: "c-five-brothers", title: "Store tour reel", stage: "planned_for_shoot", plannedShootOn: ymd(0), shootId: "sh-today" });
  push({ clientId: "c-five-brothers", title: "Winter collection teaser", stage: "shot", dueOn: ymd(2), rawUrl: "https://drive.google.com/demo/fb-raw" });

  // Devolia — going cold, behind, overdue
  push({ clientId: "c-devolia", title: "Wedding season promo", stage: "posted", postedAt: iso(-11), postOn: ymd(-11) });
  push({ clientId: "c-devolia", title: "Pool-side aerial reel", stage: "in_editing", dueOn: ymd(-5) });
  push({ clientId: "c-devolia", title: "Destination wedding package", stage: "revision_requested", dueOn: ymd(-2), revisionCount: 2, feedbackNotes: "Client wants pricing removed and brighter colour grade." });
  push({ clientId: "c-devolia", title: "Corporate retreat offer", stage: "idea", dueOn: ymd(5) });

  // Purwar — ok
  for (let i = 0; i < 3; i++) push({ clientId: "c-purwar", title: `Havells fan range reel ${i + 1}`, stage: "posted", postedAt: iso(-9 + i * 3), postOn: ymd(-9 + i * 3) });
  push({ clientId: "c-purwar", title: "Diwali lighting offer", stage: "approved", postOn: ymd(2) });
  push({ clientId: "c-purwar", title: "Geyser buying guide (Hindi)", stage: "planned_for_shoot", plannedShootOn: ymd(0), shootId: "sh-today" });

  // Amrit — onboarding
  push({ clientId: "c-amrit", title: "Brand intro reel", stage: "idea", dueOn: ymd(6) });

  // Tasks -----------------------------------------------------------------
  const tasks: TaskItem[] = [
    { id: "t-001", clientId: "c-devolia", title: "Call Devolia – confirm revision changes & next shoot", assigneeId: "u-tanvi", priority: "P1", dueOn: ymd(-2), status: "todo", checklist: [], estimatedHours: 0.5, createdAt: iso(-4), updatedAt: iso(-4), deletedAt: null },
    { id: "t-002", clientId: "c-maa-sharda", title: "Set up Dhanteras Meta ad campaign (₹5,000 budget)", assigneeId: "u-shahil", priority: "P1", dueOn: ymd(0), status: "in_progress", checklist: [{ id: "k1", text: "Audience: Orai + 25km", done: true }, { id: "k2", text: "Creative approved", done: false }, { id: "k3", text: "Pixel verified", done: false }], estimatedHours: 2, createdAt: iso(-2), updatedAt: iso(-1), deletedAt: null },
    { id: "t-003", clientId: "c-haven", title: "Share October performance report", assigneeId: "u-tanvi", priority: "P2", dueOn: ymd(1), status: "todo", checklist: [], estimatedHours: 1, createdAt: iso(-3), updatedAt: iso(-3), deletedAt: null },
    { id: "t-004", clientId: "c-five-brothers", title: "Edit: Winter collection teaser", assigneeId: "u-prathmes", priority: "P2", dueOn: ymd(2), status: "todo", contentItemId: "ci-018", checklist: [], estimatedHours: 3, createdAt: iso(-1), updatedAt: iso(-1), deletedAt: null },
    { id: "t-005", clientId: "c-purwar", title: "Collect Havells Galaxy co-branding guidelines", assigneeId: "u-tanvi", priority: "P3", dueOn: ymd(3), status: "waiting_on_client", checklist: [], estimatedHours: 0.5, createdAt: iso(-6), updatedAt: iso(-3), deletedAt: null },
    { id: "t-006", title: "Weekly Monday review prep", assigneeId: "u-tanvi", priority: "P2", dueOn: ymd(0), status: "todo", recurrence: "weekly", checklist: [], estimatedHours: 1, createdAt: iso(-7), updatedAt: iso(-7), deletedAt: null },
    { id: "t-007", clientId: "c-amrit", title: "Kickoff call with Amrit Design Infra", assigneeId: "u-vikas", priority: "P1", dueOn: ymd(0), status: "todo", checklist: [], estimatedHours: 1, createdAt: iso(-2), updatedAt: iso(-2), deletedAt: null },
    { id: "t-008", clientId: "c-hindustan", title: "Renewal discussion – Hindustan Motors", assigneeId: "u-vikas", priority: "P2", dueOn: ymd(-6), status: "todo", checklist: [], estimatedHours: 1, createdAt: iso(-10), updatedAt: iso(-10), deletedAt: null },
    { id: "t-009", clientId: "c-maa-sharda", title: "Design 2 Dhanteras posters", assigneeId: "u-prathmes", priority: "P2", dueOn: ymd(1), status: "todo", checklist: [], estimatedHours: 2.5, createdAt: iso(-1), updatedAt: iso(-1), deletedAt: null },
    { id: "t-010", clientId: "c-haven", title: "Charge batteries + pack lights for shoot", assigneeId: "u-rohit", priority: "P3", dueOn: ymd(0), status: "done", completedAt: iso(0, 9), checklist: [], estimatedHours: 0.5, createdAt: iso(-1), updatedAt: iso(0), deletedAt: null },
  ];

  const requests: ClientRequest[] = [
    { id: "r-001", clientId: "c-maa-sharda", channel: "call", body: "Sharma ji wants a Dhanteras offer video by tomorrow evening — 'Sone par making charges 50% off'.", receivedAt: iso(0, 9), loggedBy: "u-ram", priority: "P1", triageStatus: "new", attachments: [], createdAt: iso(0, 9), deletedAt: null },
    { id: "r-002", clientId: "c-haven", channel: "whatsapp", body: "Please change wardrobe reel music, client ne bola 'thoda classy chahiye'.", receivedAt: iso(-1, 17), loggedBy: "u-tanvi", priority: "P2", triageStatus: "triaged", assigneeId: "u-prathmes", dueOn: ymd(1), attachments: [], createdAt: iso(-1, 17), deletedAt: null },
    { id: "r-003", clientId: "c-devolia", channel: "meeting", body: "Wants a full wedding-season brochure PDF and 3 posters for Instagram ads.", receivedAt: iso(-3, 12), loggedBy: "u-vikas", priority: "P2", triageStatus: "in_progress", assigneeId: "u-prathmes", dueOn: ymd(2), attachments: [], createdAt: iso(-3, 12), deletedAt: null },
    { id: "r-004", clientId: "c-purwar", channel: "call", body: "Add Havells 'Galaxy' store tag in every reel caption going forward.", receivedAt: iso(0, 7), loggedBy: "u-shahil", priority: "P3", triageStatus: "new", attachments: [], createdAt: iso(0, 7), deletedAt: null },
  ];

  const projects: OneOffProject[] = [
    { id: "p-001", clientId: "c-amrit", name: "Brand identity + stationery kit", scope: "Logo, colour system, letterhead, business cards, invoice & quotation templates.", pricePaise: 4500000, deliverablesChecklist: [{ id: "d1", text: "Logo (3 concepts)", done: true }, { id: "d2", text: "Final logo + variations", done: false }, { id: "d3", text: "Stationery set", done: false }, { id: "d4", text: "Brand PDF", done: false }], revisionCount: 1, status: "in_review", assigneeId: "u-prathmes", dueOn: ymd(4), files: ["https://drive.google.com/demo/amrit-logo-v1.pdf"], createdAt: iso(-6), updatedAt: iso(-2), deletedAt: null },
    { id: "p-002", clientId: "c-devolia", name: "Wedding season brochure", scope: "8-page PDF brochure with packages and venue photos.", pricePaise: 1500000, deliverablesChecklist: [{ id: "d1", text: "Copy approved", done: false }, { id: "d2", text: "Layout", done: false }], revisionCount: 0, status: "brief_received", assigneeId: "u-prathmes", dueOn: ymd(6), files: [], createdAt: iso(-3), updatedAt: iso(-3), deletedAt: null },
    { id: "p-003", clientId: "c-maa-sharda", name: "Diwali invitation card set", scope: "Printed + WhatsApp invitation for showroom Diwali event.", pricePaise: 800000, deliverablesChecklist: [{ id: "d1", text: "Design", done: true }, { id: "d2", text: "Print-ready files", done: true }], revisionCount: 1, status: "delivered", assigneeId: "u-prathmes", dueOn: ymd(-5), files: [], createdAt: iso(-15), updatedAt: iso(-5), deletedAt: null },
  ];

  const shoots: ShootDay[] = [
    { id: "sh-today", shootDate: ymd(0), startTime: "10:00 AM", location: "Five Brothers (Jhansi Rd) → Purwar Electricals (Station Rd)", crew: ["u-tosseeb", "u-rohit", "u-tanvi"], equipmentNotes: "Sony A7IV, gimbal, 2x LED panels, lav mics", notes: "Lunch break 1:30 PM. Purwar ji available after 3 PM.", status: "planned", items: [
      { id: "si-1", shootId: "sh-today", clientId: "c-five-brothers", contentItemId: "ci-016", shotList: "Owner intro on camera (3 takes), b-roll of shelves, customer interactions" },
      { id: "si-2", shootId: "sh-today", clientId: "c-five-brothers", contentItemId: "ci-017", shotList: "Walk-through from entrance, product close-ups" },
      { id: "si-3", shootId: "sh-today", clientId: "c-purwar", contentItemId: "ci-025", shotList: "Geyser range, Purwar ji explaining in Hindi, price tags" },
    ], createdAt: iso(-3), deletedAt: null },
    { id: "sh-next", shootDate: ymd(3), startTime: "10:30 AM", location: "Maa Sharda Jewellers (Sadar Bazar)", crew: ["u-tosseeb", "u-rohit"], equipmentNotes: "Macro lens for jewellery, ring light", status: "planned", items: [
      { id: "si-4", shootId: "sh-next", clientId: "c-maa-sharda", contentItemId: "ci-010", shotList: "Gold rate explainer with Sharma ji, close-ups of coins" },
    ], createdAt: iso(-1), deletedAt: null },
    { id: "sh-past", shootDate: ymd(-7), startTime: "10:00 AM", location: "Haven Solutions showroom", crew: ["u-tosseeb", "u-rohit"], status: "completed", items: [
      { id: "si-5", shootId: "sh-past", clientId: "c-haven", contentItemId: "ci-015", shotList: "Living room before/after" },
    ], createdAt: iso(-10), deletedAt: null },
  ];

  // Onboarding checklists
  const onboarding: OnboardingStep[] = [];
  ONBOARDING_TEMPLATE.forEach((s, idx) => {
    onboarding.push({ id: `ob-amrit-${idx}`, clientId: "c-amrit", stepOrder: idx + 1, step: s.step, ownerId: s.ownerId, dueOn: ymd(-6 + s.offsetDays), doneAt: idx < 3 ? iso(-6 + idx) : undefined });
  });
  // Completed checklists for active clients
  for (const cid of ["c-maa-sharda", "c-haven", "c-five-brothers", "c-devolia", "c-purwar", "c-hindustan"]) {
    const c = clients.find((x) => x.id === cid)!;
    const base = c.onboardedOn ? Math.round((new Date(c.onboardedOn).getTime() - Date.now()) / 86400000) : -60;
    ONBOARDING_TEMPLATE.forEach((s, idx) => {
      onboarding.push({ id: `ob-${cid}-${idx}`, clientId: cid, stepOrder: idx + 1, step: s.step, ownerId: s.ownerId, dueOn: ymd(base + s.offsetDays), doneAt: iso(base + s.offsetDays) });
    });
  }

  const leads: Lead[] = [
    { id: "l-001", businessName: "Shree Balaji Furniture", contactName: "Rakesh Agarwal", phone: "+91 91111 00001", city: "Orai", industry: "Furniture", source: "referral", referredByClientId: "c-haven", serviceInterest: "12 videos retainer + ads", estimatedValuePaise: 3500000, ownerId: "u-ram", stage: "proposal_sent", nextFollowUpOn: ymd(0), followUpNote: "Call after 4 PM, discuss GST invoice", weaknessesAndGaps: "No Instagram presence; Google Business has 3 reviews.", competitorFindings: "Local competitor posts 2 reels/week with 5k+ views.", socialAdAudit: "No ads running.", createdAt: iso(-12), updatedAt: iso(-2), deletedAt: null },
    { id: "l-002", businessName: "Royal Palace Banquet", contactName: "Sunil Yadav", phone: "+91 91111 00002", city: "Jalaun", industry: "Hospitality", source: "outreach", serviceInterest: "8 videos retainer", estimatedValuePaise: 2500000, ownerId: "u-vikas", stage: "research", nextFollowUpOn: ymd(2), createdAt: iso(-5), updatedAt: iso(-1), deletedAt: null },
    { id: "l-003", businessName: "Krishna Dairy", contactName: "Mohit Gupta", phone: "+91 91111 00003", city: "Orai", industry: "FMCG", source: "inbound", serviceInterest: "Logo + packaging design", estimatedValuePaise: 2000000, ownerId: "u-ram", stage: "negotiation", nextFollowUpOn: ymd(-1), followUpNote: "Wants 10% discount; offer 5% with faster delivery", createdAt: iso(-20), updatedAt: iso(-3), deletedAt: null },
    { id: "l-004", businessName: "Orai Fitness Club", contactName: "Deepak", phone: "+91 91111 00004", city: "Orai", industry: "Fitness", source: "social", serviceInterest: "Social media management", estimatedValuePaise: 1500000, ownerId: "u-vikas", stage: "new_lead", nextFollowUpOn: ymd(1), createdAt: iso(-1), updatedAt: iso(-1), deletedAt: null },
    { id: "l-005", businessName: "Shubh Mangal Caterers", contactName: "Anil", phone: "+91 91111 00005", city: "Orai", industry: "Catering", source: "referral", referredByClientId: "c-devolia", serviceInterest: "Posters + reels", estimatedValuePaise: 1800000, ownerId: "u-ram", stage: "lost", lostReason: "Budget — went with freelancer", createdAt: iso(-40), updatedAt: iso(-20), deletedAt: null },
  ];

  const yr = new Date().getFullYear();
  const invoices: Invoice[] = [
    { id: "inv-1", clientId: "c-maa-sharda", invoiceNumber: `OM-${yr}-006`, issueDate: ymd(-19), dueDate: ymd(-12), gstApplicable: true, gstRatePercent: 18, items: [{ id: "li1", description: "Monthly retainer – 12 videos / month", quantity: 1, unitPricePaise: 3500000, lineTotalPaise: 3500000 }], subtotalPaise: 3500000, gstAmountPaise: 630000, totalPaise: 4130000, status: "paid", createdAt: iso(-19), deletedAt: null },
    { id: "inv-2", clientId: "c-devolia", invoiceNumber: `OM-${yr}-007`, issueDate: ymd(-11), dueDate: ymd(-4), gstApplicable: true, gstRatePercent: 18, items: [{ id: "li1", description: "Monthly retainer – 12 videos / month", quantity: 1, unitPricePaise: 4000000, lineTotalPaise: 4000000 }], subtotalPaise: 4000000, gstAmountPaise: 720000, totalPaise: 4720000, status: "overdue", createdAt: iso(-11), deletedAt: null },
    { id: "inv-3", clientId: "c-haven", invoiceNumber: `OM-${yr}-008`, issueDate: ymd(-3), dueDate: ymd(4), gstApplicable: true, gstRatePercent: 18, items: [{ id: "li1", description: "Monthly retainer – 8 videos / month", quantity: 1, unitPricePaise: 2500000, lineTotalPaise: 2500000 }, { id: "li2", description: "Extra festive poster", quantity: 2, unitPricePaise: 150000, lineTotalPaise: 300000 }], subtotalPaise: 2800000, gstAmountPaise: 504000, totalPaise: 3304000, status: "partially_paid", createdAt: iso(-3), deletedAt: null },
  ];

  const quotations: Quotation[] = [
    { id: "q-1", leadId: "l-001", recipientName: "Shree Balaji Furniture", quotationNumber: `OMQ-${yr}-003`, issueDate: ymd(-4), validUntil: ymd(10), gstApplicable: true, gstRatePercent: 18, items: [{ id: "qi1", description: "12 videos / month retainer", quantity: 1, unitPricePaise: 3500000, lineTotalPaise: 3500000 }, { id: "qi2", description: "Meta ads management (ad spend extra)", quantity: 1, unitPricePaise: 500000, lineTotalPaise: 500000 }], subtotalPaise: 4000000, gstAmountPaise: 720000, totalPaise: 4720000, status: "sent", createdAt: iso(-4), deletedAt: null },
  ];

  const payments: PaymentRecord[] = [
    { id: "pay-1", clientId: "c-maa-sharda", invoiceId: "inv-1", amountPaise: 4130000, paidOn: ymd(-15), method: "Bank Transfer (NEFT/IMPS)", referenceNo: "NEFT123456", createdBy: "u-ram", createdAt: iso(-15), deletedAt: null },
    { id: "pay-2", clientId: "c-haven", invoiceId: "inv-3", amountPaise: 1500000, paidOn: ymd(-1), method: "UPI", referenceNo: "UPI98765", notes: "Part payment, balance after reel approval", createdBy: "u-tanvi", createdAt: iso(-1), deletedAt: null },
    { id: "pay-3", clientId: "c-maa-sharda", projectId: "p-003", amountPaise: 800000, paidOn: ymd(-4), method: "Cash", createdBy: "u-ram", createdAt: iso(-4), deletedAt: null },
  ];

  const documents: ClientDocument[] = [
    { id: "doc-1", clientId: "c-maa-sharda", kind: "proposal", title: "Growth proposal – Maa Sharda Jewellers", filePathOrUrl: "https://drive.google.com/demo/msj-proposal.pdf", version: 2, createdBy: "u-ram", createdAt: iso(-140), deletedAt: null },
    { id: "doc-2", clientId: "c-devolia", kind: "brand_pdf", title: "Devolia brand guidelines", filePathOrUrl: "https://drive.google.com/demo/devolia-brand.pdf", version: 1, createdBy: "u-tanvi", createdAt: iso(-200), deletedAt: null },
    { id: "doc-3", clientId: "c-haven", kind: "drive_link", title: "Raw footage – Oct shoot", filePathOrUrl: "https://drive.google.com/demo/haven-raw-oct", version: 1, createdBy: "u-tosseeb", createdAt: iso(-7), deletedAt: null },
  ];

  const comments: CommentItem[] = [
    { id: "cm-1", entityType: "content_item", entityId: "ci-008", clientId: "c-maa-sharda", body: "@Tanvi bridal set reel ready for your check — Sharma ji wants it before Dhanteras.", mentions: ["u-tanvi"], createdBy: "u-prathmes", createdAt: iso(-3), deletedAt: null },
    { id: "cm-2", entityType: "task", entityId: "t-001", clientId: "c-devolia", body: "Tried calling twice, no answer. Will WhatsApp.", mentions: [], createdBy: "u-tanvi", createdAt: iso(-1), deletedAt: null },
  ];

  const activity: ActivityLogEntry[] = [
    { id: "al-1", entityType: "content_item", entityId: "ci-006", clientId: "c-maa-sharda", actorId: "u-shahil", action: "stage_changed", summary: "Moved 'Diwali collection reel 6' to Posted", at: iso(-1, 18) },
    { id: "al-2", entityType: "request", entityId: "r-001", clientId: "c-maa-sharda", actorId: "u-ram", action: "created", summary: "Logged call request from Sharma ji", at: iso(0, 9) },
    { id: "al-3", entityType: "payment", entityId: "pay-2", clientId: "c-haven", actorId: "u-tanvi", action: "created", summary: "Recorded payment ₹15,000 (UPI)", at: iso(-1, 12) },
    { id: "al-4", entityType: "task", entityId: "t-010", clientId: "c-haven", actorId: "u-rohit", action: "completed", summary: "Completed 'Charge batteries + pack lights'", at: iso(0, 9) },
    { id: "al-5", entityType: "content_item", entityId: "ci-021", clientId: "c-devolia", actorId: "u-tanvi", action: "stage_changed", summary: "Moved 'Destination wedding package' to Revision requested (revision #2)", at: iso(-9, 15) },
    { id: "al-6", entityType: "project", entityId: "p-001", clientId: "c-amrit", actorId: "u-prathmes", action: "status_changed", summary: "Project 'Brand identity + stationery kit' → In review", at: iso(-2, 16) },
    { id: "al-7", entityType: "shoot", entityId: "sh-today", actorId: "u-tanvi", action: "created", summary: "Planned shoot day: Five Brothers → Purwar Electricals", at: iso(-3, 11) },
  ];

  const notifications: NotificationItem[] = [
    { id: "nt-1", recipientId: "u-tanvi", title: "Request waiting > 4 hours", body: "Maa Sharda Jewellers call request is still 'New'.", channel: "in_app", linkUrl: "/requests", createdAt: iso(0, 13) },
    { id: "nt-2", recipientId: "u-ram", title: "Payment overdue", body: "Devolia Resort invoice OM-" + yr + "-007 (₹47,200) is overdue.", channel: "in_app", linkUrl: "/money", createdAt: iso(-1, 9) },
    { id: "nt-3", recipientId: "u-prathmes", title: "You were mentioned", body: "Tanvi: 'please re-export wardrobe reel in 4K'", channel: "in_app", linkUrl: "/content", createdAt: iso(-1, 15), readAt: iso(-1, 16) },
    { id: "nt-4", recipientId: "u-tanvi", title: "Friday: plan next week's shoot", body: "Two clients have no shoot scheduled for next week.", channel: "in_app", linkUrl: "/shoots", createdAt: iso(-2, 10) },
  ];

  void now;
  return { clients, contacts, socials, assets, plans, content, tasks, requests, projects, shoots, onboarding, leads, invoices, quotations, payments, documents, comments, activity, notifications };
}
