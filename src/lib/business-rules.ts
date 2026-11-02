import {
  Client,
  ClientBrandAsset,
  ClientContact,
  ClientPlan,
  ClientSocialAccount,
  ContentItem,
  HealthStatus,
  HealthThresholds,
  InvoiceLineItem,
  PriorityWeights,
  TaskPriority,
} from "./types";

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  greenMaxInactiveDays: 3,
  amberMaxInactiveDays: 6,
  redMinInactiveDays: 7,
  amberBehindItems: 1,
  redBehindItems: 3,
  approvalWaitDays: 2,
  overdueRedDays: 3,
  requestSlaHours: 4,
  weeklyEditCapacity: 18,
};

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  baseP1: 100,
  baseP2: 50,
  baseP3: 20,
  dueTodayBonus: 40,
  overduePerDay: 10,
  overdueMaxBonus: 60,
  clientRedBonus: 30,
  approvalWaitBonus: 25,
  scheduledTodayNotReadyBonus: 20,
  todayShootBonus: 15,
};

/**
 * Normalize a date string (YYYY-MM-DD or ISO) to UTC midnight Date for deterministic day math.
 */
export function parseUTCDate(dateStr: string): Date {
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatYYYYMMDD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format date as DD/MM/YYYY (Section 5.8).
 */
export function formatDateDDMMYYYY(dateInput?: string | Date | null): string {
  if (!dateInput) return "—";
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  return `${day}/${month}/${year}`;
}

/**
 * Format timestamp in 12-hour IST (Section 5.8).
 */
export function formatDateTimeIST(isoInput?: string | Date | null): string {
  if (!isoInput) return "—";
  const date = typeof isoInput === "string" ? new Date(isoInput) : isoInput;
  if (isNaN(date.getTime())) return "—";
  const datePart = formatDateDDMMYYYY(date);
  const timePart = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toUpperCase();
  return `${datePart}, ${timePart} IST`;
}

export function daysBetweenDates(fromDateStr: string, toDateStr: string): number {
  const from = parseUTCDate(fromDateStr);
  const to = parseUTCDate(toDateStr);
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function formatRelativeDaysAgo(isoOrDate: string, nowIso: string): string {
  const d1 = isoOrDate.slice(0, 10);
  const d2 = nowIso.slice(0, 10);
  const days = daysBetweenDates(d1, d2);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

/**
 * Section 8: Monthly Retainer Cycle Calculation
 * Each retainer client has a monthly cycle starting on their billing day (e.g. 12th to 11th),
 * not the calendar month.
 */
export interface CycleWindow {
  cycleStart: string; // YYYY-MM-DD
  cycleEnd: string; // YYYY-MM-DD
  daysInCycle: number;
  daysElapsed: number;
}

export function getClientCycleWindow(cycleDay: number, referenceDateStr: string): CycleWindow {
  const safeDay = Math.max(1, Math.min(28, cycleDay || 1));
  const ref = parseUTCDate(referenceDateStr);
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth(); // 0-indexed
  const d = ref.getUTCDate();

  let startUTC: Date;
  let nextStartUTC: Date;

  if (d >= safeDay) {
    startUTC = new Date(Date.UTC(y, m, safeDay));
    nextStartUTC = new Date(Date.UTC(y, m + 1, safeDay));
  } else {
    startUTC = new Date(Date.UTC(y, m - 1, safeDay));
    nextStartUTC = new Date(Date.UTC(y, m, safeDay));
  }

  const endUTC = new Date(nextStartUTC.getTime() - 24 * 60 * 60 * 1000);
  const daysInCycle = Math.max(
    1,
    Math.round((nextStartUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24))
  );
  const rawElapsed = Math.floor((ref.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = Math.max(0, Math.min(daysInCycle, rawElapsed));

  return {
    cycleStart: formatYYYYMMDD(startUTC),
    cycleEnd: formatYYYYMMDD(endUTC),
    daysInCycle,
    daysElapsed,
  };
}

/**
 * Section 8: Cycle Progress & Behind-Schedule Calculation
 * Progress = posted items in the current cycle / videos promised.
 * expected_by_today = promised * (days elapsed in cycle / days in cycle).
 * If posted + approved-and-scheduled is more than 1 below expected, the client is "Behind".
 */
export interface CycleProgressResult {
  cycleStart: string;
  cycleEnd: string;
  daysInCycle: number;
  daysElapsed: number;
  promised: number;
  postedCount: number;
  approvedAndScheduledCount: number;
  completedEquivalent: number;
  expectedByToday: number;
  deficit: number; // expectedByToday - (posted + approvedAndScheduled)
  behindCount: number; // integer count of items behind (0 if not behind)
  isBehind: boolean;
  progressPercent: number;
}

export function calculateCycleProgress(
  plan: Pick<ClientPlan, "cycleDay" | "videosPerCycle">,
  clientContentItems: ContentItem[],
  todayStr: string
): CycleProgressResult {
  const window = getClientCycleWindow(plan.cycleDay, todayStr);
  const promised = Math.max(0, plan.videosPerCycle);

  const activeItems = clientContentItems.filter((item) => !item.deletedAt);

  // Items posted within current cycle (or whose postOn / postedAt falls in current cycle)
  const postedInCycle = activeItems.filter((item) => {
    if (item.stage !== "posted") return false;
    const effectiveDate = (item.postedAt ?? item.postOn ?? item.updatedAt).slice(0, 10);
    return effectiveDate >= window.cycleStart && effectiveDate <= window.cycleEnd;
  });

  // Items approved or scheduled in current cycle
  const approvedOrScheduledInCycle = activeItems.filter((item) => {
    if (item.stage !== "approved" && item.stage !== "scheduled") return false;
    const effectiveDate = (item.postOn ?? item.dueOn ?? item.updatedAt).slice(0, 10);
    return effectiveDate >= window.cycleStart && effectiveDate <= window.cycleEnd;
  });

  const postedCount = postedInCycle.length;
  const approvedAndScheduledCount = approvedOrScheduledInCycle.length;
  const completedEquivalent = postedCount + approvedAndScheduledCount;

  const expectedByToday =
    promised > 0 ? promised * (window.daysElapsed / window.daysInCycle) : 0;

  const deficit = expectedByToday - completedEquivalent;
  // "If posted + approved-and-scheduled is more than 1 below expected, the client is 'Behind'"
  const isBehind = deficit > 1;
  const behindCount = isBehind ? Math.max(1, Math.ceil(deficit - 0.0001)) : 0;

  const progressPercent =
    promised > 0 ? Math.min(100, Math.round((postedCount / promised) * 100)) : 100;

  return {
    ...window,
    promised,
    postedCount,
    approvedAndScheduledCount,
    completedEquivalent,
    expectedByToday: Number(expectedByToday.toFixed(2)),
    deficit: Number(deficit.toFixed(2)),
    behindCount,
    isBehind,
    progressPercent,
  };
}

/**
 * Section 8: Client Health Evaluation
 * - Green: last activity within 3 days and not behind.
 * - Amber: last activity 4 to 6 days ago, or behind by 1 to 2 items, or approval waiting more than 2 days.
 * - Red: last activity 7 or more days ago, or behind by 3 or more items, or any item overdue by more than 3 days, or payment overdue.
 * - Owners can manually override for a set time with a reason.
 */
export interface ClientHealthEvaluation {
  status: HealthStatus;
  reasons: string[];
  inactiveDays: number;
  isOverridden: boolean;
}

export function evaluateClientHealth(params: {
  client: Pick<
    Client,
    "lastActivityAt" | "healthOverride" | "healthOverrideReason" | "healthOverrideUntil"
  >;
  cycleProgress?: CycleProgressResult | null;
  contentItems: ContentItem[];
  overdueTaskDaysMax: number;
  hasOverduePayment: boolean;
  todayStr: string;
  thresholds?: HealthThresholds;
}): ClientHealthEvaluation {
  const {
    client,
    cycleProgress,
    contentItems,
    overdueTaskDaysMax,
    hasOverduePayment,
    todayStr,
    thresholds = DEFAULT_HEALTH_THRESHOLDS,
  } = params;

  const lastActivityDate = client.lastActivityAt.slice(0, 10);
  const inactiveDays = Math.max(0, daysBetweenDates(lastActivityDate, todayStr));

  // Check manual Owner override if still active
  if (
    client.healthOverride &&
    (!client.healthOverrideUntil || client.healthOverrideUntil.slice(0, 10) >= todayStr)
  ) {
    return {
      status: client.healthOverride,
      reasons: [
        `Manual override (${client.healthOverride.toUpperCase()}): ${
          client.healthOverrideReason || "Set by Owner"
        }`,
      ],
      inactiveDays,
      isOverridden: true,
    };
  }

  const redReasons: string[] = [];
  const amberReasons: string[] = [];

  // Check inactivity
  if (inactiveDays >= thresholds.redMinInactiveDays) {
    redReasons.push(`No activity for ${inactiveDays} days`);
  } else if (inactiveDays > thresholds.greenMaxInactiveDays) {
    amberReasons.push(`Last activity ${inactiveDays} days ago`);
  }

  // Check behind schedule
  const behindCount = cycleProgress?.behindCount ?? 0;
  if (behindCount >= thresholds.redBehindItems) {
    redReasons.push(`Behind schedule by ${behindCount} videos`);
  } else if (behindCount >= thresholds.amberBehindItems) {
    amberReasons.push(`Behind schedule by ${behindCount} video${behindCount > 1 ? "s" : ""}`);
  }

  // Check overdue items (> 3 days overdue = Red)
  let maxItemOverdueDays = overdueTaskDaysMax;
  let maxApprovalWaitDays = 0;

  for (const item of contentItems) {
    if (item.deletedAt || item.stage === "posted" || item.stage === "dropped") continue;
    if (item.dueOn) {
      const overdue = daysBetweenDates(item.dueOn, todayStr);
      if (overdue > maxItemOverdueDays) maxItemOverdueDays = overdue;
    }
    if (item.stage === "ready_for_approval") {
      const waitDays = daysBetweenDates(item.stageChangedAt.slice(0, 10), todayStr);
      if (waitDays > maxApprovalWaitDays) maxApprovalWaitDays = waitDays;
    }
  }

  if (maxItemOverdueDays > thresholds.overdueRedDays) {
    redReasons.push(`Work overdue by ${maxItemOverdueDays} days`);
  } else if (maxItemOverdueDays > 0) {
    amberReasons.push(`Item overdue by ${maxItemOverdueDays} day${maxItemOverdueDays > 1 ? "s" : ""}`);
  }

  if (maxApprovalWaitDays > thresholds.approvalWaitDays) {
    amberReasons.push(`Approval waiting ${maxApprovalWaitDays} days`);
  }

  if (hasOverduePayment) {
    redReasons.push("Invoice payment overdue");
  }

  if (redReasons.length > 0) {
    return { status: "red", reasons: redReasons, inactiveDays, isOverridden: false };
  }
  if (amberReasons.length > 0) {
    return { status: "amber", reasons: amberReasons, inactiveDays, isOverridden: false };
  }

  return {
    status: "green",
    reasons: ["On track · active within 3 days"],
    inactiveDays,
    isOverridden: false,
  };
}

/**
 * Section 8: Priority Score for Today
 * - Base: P1 = 100, P2 = 50, P3 = 20.
 * - +40 if due today
 * - +10 per day overdue (cap 60)
 * - +30 if the client's health is red
 * - +25 if an item has waited on approval for more than 2 days
 * - +20 if a post is scheduled for today and is not yet ready
 * - +15 if the item is part of today's shoot
 */
export interface PriorityScoreInput {
  priority: TaskPriority;
  dueOn?: string;
  todayStr: string;
  clientHealth?: HealthStatus;
  waitingApprovalDays?: number;
  postScheduledTodayNotReady?: boolean;
  partOfTodayShoot?: boolean;
  weights?: PriorityWeights;
}

export interface PriorityScoreResult {
  score: number;
  reasons: string[];
  reasonSummary: string;
  overdueDays: number;
}

export function calculatePriorityScore(input: PriorityScoreInput): PriorityScoreResult {
  const weights = input.weights ?? DEFAULT_PRIORITY_WEIGHTS;
  const reasons: string[] = [];

  let score =
    input.priority === "P1"
      ? weights.baseP1
      : input.priority === "P2"
      ? weights.baseP2
      : weights.baseP3;

  reasons.push(`${input.priority} base`);

  let overdueDays = 0;
  if (input.dueOn) {
    const diff = daysBetweenDates(input.dueOn, input.todayStr);
    if (diff === 0) {
      score += weights.dueTodayBonus;
      reasons.push("Due today");
    } else if (diff > 0) {
      overdueDays = diff;
      const overdueBonus = Math.min(weights.overdueMaxBonus, diff * weights.overduePerDay);
      score += overdueBonus;
      reasons.push(`Overdue ${diff} day${diff > 1 ? "s" : ""}`);
    }
  }

  if (input.clientHealth === "red") {
    score += weights.clientRedBonus;
    reasons.push("client is red");
  }

  if ((input.waitingApprovalDays ?? 0) > 2) {
    score += weights.approvalWaitBonus;
    reasons.push(`waiting approval ${input.waitingApprovalDays}d`);
  }

  if (input.postScheduledTodayNotReady) {
    score += weights.scheduledTodayNotReadyBonus;
    reasons.push("post due today & not ready");
  }

  if (input.partOfTodayShoot) {
    score += weights.todayShootBonus;
    reasons.push("in today's shoot");
  }

  const displayReasons = reasons.filter((r) => !r.endsWith("base"));
  const reasonSummary =
    displayReasons.length > 0 ? displayReasons.join(" · ") : `${input.priority} priority`;

  return {
    score,
    reasons,
    reasonSummary,
    overdueDays,
  };
}

/**
 * Section 5.5 & Section 9: Exact Paise Money Formatting & Indian Digit Grouping (₹1,25,000)
 * Never silently round paise. Show paise when non-zero.
 */
export function formatPaiseToINR(paise: number, showSymbol = true): string {
  const isNegative = paise < 0;
  const absPaise = Math.round(Math.abs(paise));
  const rupees = Math.floor(absPaise / 100);
  const remPaise = absPaise % 100;

  const rupeeStr = formatIndianNumber(rupees);
  const paiseSuffix = remPaise > 0 ? `.${String(remPaise).padStart(2, "0")}` : "";
  const prefix = showSymbol ? "₹" : "";
  return `${isNegative ? "-" : ""}${prefix}${rupeeStr}${paiseSuffix}`;
}

export function formatIndianNumber(num: number): string {
  const str = Math.floor(Math.abs(num)).toString();
  if (str.length <= 3) return str;
  const lastThree = str.slice(-3);
  const otherNumbers = str.slice(0, -3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formattedOther},${lastThree}`;
}

/**
 * Section 5.5 & Section 6.10: Amount in Words in the Indian Numbering System (Crore, Lakh, Thousand)
 * Exact to the paise.
 */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one > 0 ? " " + ONES[one] : ""}`;
}

function rupeesIntegerToIndianWords(n: number): string {
  if (n === 0) return "Zero";

  const parts: string[] = [];
  let remaining = Math.floor(n);

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    parts.push(`${rupeesIntegerToIndianWords(crore)} Crore`);
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  }

  const hundred = Math.floor(remaining / 100);
  remaining %= 100;
  if (hundred > 0) {
    parts.push(`${ONES[hundred]} Hundred`);
  }

  if (remaining > 0) {
    if (parts.length > 0) {
      parts.push(`and ${twoDigitsToWords(remaining)}`);
    } else {
      parts.push(twoDigitsToWords(remaining));
    }
  }

  return parts.join(" ");
}

export function amountInWordsINR(paise: number): string {
  const absPaise = Math.round(Math.abs(paise));
  const rupees = Math.floor(absPaise / 100);
  const remPaise = absPaise % 100;

  const rupeeWords = `Rupees ${rupeesIntegerToIndianWords(rupees)}`;
  if (remPaise === 0) {
    return `${rupeeWords} Only`;
  }
  const paiseWords = `${twoDigitsToWords(remPaise)} Paise`;
  return `${rupeeWords} and ${paiseWords} Only`;
}

/**
 * Section 6.10 & Section 8: Exact Invoice & Quotation Math in Paise (Integers)
 */
export interface InvoiceTotalsPaise {
  subtotalPaise: number;
  gstAmountPaise: number;
  totalPaise: number;
}

export function calculateInvoiceTotalsPaise(
  items: Pick<InvoiceLineItem, "quantity" | "unitPricePaise">[],
  gstApplicable: boolean,
  gstRatePercent = 18
): InvoiceTotalsPaise {
  const subtotalPaise = items.reduce((acc, item) => {
    const qty = Math.max(0, Math.round(item.quantity));
    const unit = Math.round(item.unitPricePaise);
    return acc + qty * unit;
  }, 0);

  // Compute GST in exact paise: (subtotalPaise * gstRatePercent) / 100
  const gstAmountPaise = gstApplicable
    ? Math.round((subtotalPaise * gstRatePercent) / 100)
    : 0;

  const totalPaise = subtotalPaise + gstAmountPaise;
  return {
    subtotalPaise,
    gstAmountPaise,
    totalPaise,
  };
}

/**
 * Format automatic invoice/quotation number: OM-YYYY-NNN or OMQ-YYYY-NNN
 */
export function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Section 6.2 & Section 8: Spelling Guard
 * When saving any client-facing field (name, brand, document title),
 * warn if it matches a stored wrong spelling for that client (or any client).
 */
export interface SpellingWarning {
  matchedWrongSpelling: string;
  officialName: string;
  clientId: string;
  message: string;
}

export function checkSpellingGuard(
  inputText: string,
  clients: Pick<Client, "id" | "officialName" | "wrongSpellings">[],
  targetClientId?: string
): SpellingWarning[] {
  if (!inputText || !inputText.trim()) return [];
  const lowerInput = inputText.toLowerCase();
  const warnings: SpellingWarning[] = [];

  const scope = targetClientId
    ? clients.filter((c) => c.id === targetClientId)
    : clients;

  for (const client of scope) {
    for (const wrong of client.wrongSpellings || []) {
      const cleanWrong = wrong.trim();
      if (!cleanWrong) continue;
      if (lowerInput.includes(cleanWrong.toLowerCase())) {
        warnings.push({
          matchedWrongSpelling: cleanWrong,
          officialName: client.officialName,
          clientId: client.id,
          message: `Spelling warning: "${cleanWrong}" is a known wrong spelling. Always use official spelling "${client.officialName}".`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Section 6.2: Client Profile Completeness Meter
 * A client's profile is incomplete until the key items exist:
 * (official spelling, logo file, address, Maps link, contact person, social handles, package, fee, start date).
 * Missing items are listed with a one-line benefit.
 */
export interface CompletenessCheckItem {
  key: string;
  label: string;
  present: boolean;
  benefit: string;
}

export interface ProfileCompletenessResult {
  scorePercent: number;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  items: CompletenessCheckItem[];
  missingItems: CompletenessCheckItem[];
}

export function evaluateProfileCompleteness(params: {
  client: Client;
  contacts: ClientContact[];
  socials: ClientSocialAccount[];
  assets: ClientBrandAsset[];
  plan?: ClientPlan | null;
}): ProfileCompletenessResult {
  const { client, contacts, socials, assets, plan } = params;

  const hasLogo = assets.some(
    (a) => (a.type === "logo_png" || a.type === "logo_svg") && Boolean(a.fileUrl || a.title)
  );

  const items: CompletenessCheckItem[] = [
    {
      key: "official_name",
      label: "Official business spelling",
      present: Boolean(client.officialName && client.officialName.trim().length > 1),
      benefit:
        "Ensure every poster, video title, and GST invoice uses the exact legal/brand spelling.",
    },
    {
      key: "logo_file",
      label: "Brand logo file (PNG/SVG)",
      present: hasLogo,
      benefit:
        "Upload transparent PNG/SVG logo so editors and designers never use low-res WhatsApp forwards.",
    },
    {
      key: "address",
      label: "Business address & city",
      present: Boolean(client.address && client.address.trim().length > 4),
      benefit:
        "Required for poster footers, ad location targeting, and compliant invoices.",
    },
    {
      key: "maps_url",
      label: "Google Maps link",
      present: Boolean(client.mapsUrl && client.mapsUrl.trim().startsWith("http")),
      benefit:
        "Add the Maps link so we can add a location tag and a QR code to creatives.",
    },
    {
      key: "contact_person",
      label: "Primary contact person & phone",
      present: contacts.length > 0 && Boolean(contacts[0].phone),
      benefit:
        "So Tanvi and the shoot crew know who approves scripts and coordinates shoot days.",
    },
    {
      key: "social_handles",
      label: "Social media handles (Instagram / FB)",
      present: socials.length > 0,
      benefit:
        "Required for Shahil to schedule reels and tag collaborator accounts in Meta Business Suite.",
    },
    {
      key: "package",
      label: "Agreed package & deliverables",
      present: Boolean(plan && plan.packageName),
      benefit:
        "Sets the monthly video target so cycle progress and behind-schedule alerts work automatically.",
    },
    {
      key: "fee",
      label: "Monthly retainer fee / project fee",
      present: Boolean(plan && plan.monthlyFeePaise > 0),
      benefit:
        "Powers automatic invoice generation, balance tracking, and renewal reminders.",
    },
    {
      key: "start_date",
      label: "Onboarding & cycle start date",
      present: Boolean(client.onboardedOn && plan?.startsOn),
      benefit:
        "Anchors the monthly billing cycle and tracks exact client tenure from day one.",
    },
  ];

  const completedCount = items.filter((i) => i.present).length;
  const totalCount = items.length;
  const scorePercent = Math.round((completedCount / totalCount) * 100);

  return {
    scorePercent,
    completedCount,
    totalCount,
    isComplete: completedCount === totalCount,
    items,
    missingItems: items.filter((i) => !i.present),
  };
}

/**
 * Section 6.3 & 8: Request Triage SLA check (4 working hours)
 */
export function isRequestOverdueForTriage(
  receivedAtIso: string,
  triageStatus: string,
  nowIso: string,
  slaHours = 4
): { isFlagged: boolean; hoursElapsed: number } {
  if (triageStatus !== "new") {
    return { isFlagged: false, hoursElapsed: 0 };
  }
  const receivedMs = new Date(receivedAtIso).getTime();
  const nowMs = new Date(nowIso).getTime();
  const hoursElapsed = Math.max(0, (nowMs - receivedMs) / (1000 * 60 * 60));
  return {
    isFlagged: hoursElapsed > slaHours,
    hoursElapsed: Number(hoursElapsed.toFixed(1)),
  };
}
