import { AppState } from "./store";
import {
  CycleProgressResult,
  ClientHealthEvaluation,
  calculateCycleProgress,
  calculatePriorityScore,
  daysBetweenDates,
  evaluateClientHealth,
  isRequestOverdueForTriage,
} from "./business-rules";
import { Client, ClientPlan, ContentItem, HealthStatus, TaskItem, TaskPriority } from "./types";

export interface ClientMetrics {
  client: Client;
  plan: ClientPlan | null;
  progress: CycleProgressResult | null;
  health: ClientHealthEvaluation;
  openTasks: number;
  balanceDuePaise: number;
  hasOverduePayment: number; // count of overdue invoices
  inactiveDays: number;
}

export function activeClients(state: AppState): Client[] {
  return state.clients.filter((c) => !c.deletedAt);
}

export function getClientMetrics(state: AppState, client: Client, today: string): ClientMetrics {
  const plan = state.plans.find((p) => p.clientId === client.id && p.active) ?? null;
  const content = state.content.filter((c) => c.clientId === client.id && !c.deletedAt);
  const tasks = state.tasks.filter((t) => t.clientId === client.id && !t.deletedAt && t.status !== "done");
  const progress =
    plan && plan.videosPerCycle > 0 && client.engagementType !== "one_off"
      ? calculateCycleProgress(plan, content, today)
      : null;

  const overdueTaskDaysMax = tasks.reduce((max, t) => {
    const d = daysBetweenDates(t.dueOn, today);
    return d > max ? d : max;
  }, 0);

  const invoices = state.invoices.filter((i) => i.clientId === client.id && !i.deletedAt);
  const paidByInvoice = (invId: string) =>
    state.payments.filter((p) => p.invoiceId === invId && !p.deletedAt).reduce((a, p) => a + p.amountPaise, 0);
  const overdueInvoices = invoices.filter((i) => paidByInvoice(i.id) < i.totalPaise && i.dueDate < today);
  const balanceDuePaise = invoices.reduce((acc, i) => acc + Math.max(0, i.totalPaise - paidByInvoice(i.id)), 0);

  const health = evaluateClientHealth({
    client,
    cycleProgress: progress,
    contentItems: content,
    overdueTaskDaysMax,
    hasOverduePayment: overdueInvoices.length > 0,
    todayStr: today,
    thresholds: state.settings.healthThresholds,
  });

  return {
    client,
    plan,
    progress,
    health,
    openTasks: tasks.length,
    balanceDuePaise,
    hasOverduePayment: overdueInvoices.length,
    inactiveDays: health.inactiveDays,
  };
}

export function allClientMetrics(state: AppState, today: string): ClientMetrics[] {
  return activeClients(state).map((c) => getClientMetrics(state, c, today));
}

// ---------------------------------------------------------------------------
// Today screen
// ---------------------------------------------------------------------------
export interface PriorityRow {
  id: string;
  kind: "task" | "content" | "project" | "request" | "lead";
  title: string;
  clientId?: string;
  clientName: string;
  assigneeId: string;
  dueOn?: string;
  priority: TaskPriority;
  score: number;
  reason: string;
  overdueDays: number;
  stageLabel?: string;
}

const STAGE_TO_PRIORITY: Partial<Record<ContentItem["stage"], TaskPriority>> = {
  revision_requested: "P1",
  ready_for_approval: "P2",
  in_editing: "P2",
  shot: "P2",
  scheduled: "P2",
  approved: "P2",
  planned_for_shoot: "P3",
  idea: "P3",
};

export function buildTodayPriorities(state: AppState, today: string, healthMap: Map<string, HealthStatus>): PriorityRow[] {
  const rows: PriorityRow[] = [];
  const todayShoot = state.shoots.find((s) => s.shootDate === today && s.status === "planned" && !s.deletedAt);
  const todayShootItemIds = new Set(todayShoot?.items.map((i) => i.contentItemId) ?? []);
  const name = (id?: string) => state.clients.find((c) => c.id === id)?.displayName ?? "Internal";
  const weights = state.settings.priorityWeights;

  for (const t of state.tasks) {
    if (t.deletedAt || t.status === "done") continue;
    const res = calculatePriorityScore({
      priority: t.priority,
      dueOn: t.dueOn,
      todayStr: today,
      clientHealth: t.clientId ? healthMap.get(t.clientId) : undefined,
      weights,
    });
    rows.push({ id: t.id, kind: "task", title: t.title, clientId: t.clientId, clientName: name(t.clientId), assigneeId: t.assigneeId, dueOn: t.dueOn, priority: t.priority, score: res.score, reason: res.reasonSummary + (t.status === "waiting_on_client" ? " · waiting on client" : ""), overdueDays: res.overdueDays });
  }

  for (const c of state.content) {
    if (c.deletedAt || c.stage === "posted" || c.stage === "dropped") continue;
    const waitingDays = c.stage === "ready_for_approval" ? daysBetweenDates(c.stageChangedAt.slice(0, 10), today) : 0;
    const scheduledTodayNotReady = c.postOn === today && !["approved", "scheduled"].includes(c.stage);
    const due = c.dueOn ?? (c.postOn && c.postOn <= today ? c.postOn : undefined);
    const priority = STAGE_TO_PRIORITY[c.stage] ?? "P3";
    // Only surface content that is actionable today (has a due/post date today or earlier, waiting approval, in today's shoot, or revision requested)
    const actionable = Boolean(due && due <= today) || waitingDays > 0 || scheduledTodayNotReady || todayShootItemIds.has(c.id) || c.stage === "revision_requested";
    if (!actionable) continue;
    const res = calculatePriorityScore({
      priority,
      dueOn: due,
      todayStr: today,
      clientHealth: healthMap.get(c.clientId),
      waitingApprovalDays: waitingDays,
      postScheduledTodayNotReady: scheduledTodayNotReady,
      partOfTodayShoot: todayShootItemIds.has(c.id),
      weights,
    });
    rows.push({ id: c.id, kind: "content", title: c.title, clientId: c.clientId, clientName: name(c.clientId), assigneeId: c.assigneeId, dueOn: due, priority, score: res.score, reason: res.reasonSummary, overdueDays: res.overdueDays, stageLabel: c.stage });
  }

  for (const p of state.projects) {
    if (p.deletedAt || p.status === "paid" || p.status === "delivered") continue;
    const res = calculatePriorityScore({ priority: "P2", dueOn: p.dueOn, todayStr: today, clientHealth: healthMap.get(p.clientId), weights });
    if (daysBetweenDates(p.dueOn, today) < -2) continue; // not yet urgent
    rows.push({ id: p.id, kind: "project", title: `Project: ${p.name}`, clientId: p.clientId, clientName: name(p.clientId), assigneeId: p.assigneeId, dueOn: p.dueOn, priority: "P2", score: res.score, reason: res.reasonSummary + " · one-off project", overdueDays: res.overdueDays, stageLabel: p.status });
  }

  for (const r of state.requests) {
    if (r.deletedAt || r.triageStatus !== "new") continue;
    const sla = isRequestOverdueForTriage(r.receivedAt, r.triageStatus, new Date().toISOString(), state.settings.healthThresholds.requestSlaHours);
    const res = calculatePriorityScore({ priority: r.priority, dueOn: today, todayStr: today, clientHealth: healthMap.get(r.clientId), weights });
    rows.push({ id: r.id, kind: "request", title: `Triage request: ${r.body.slice(0, 60)}${r.body.length > 60 ? "…" : ""}`, clientId: r.clientId, clientName: name(r.clientId), assigneeId: "u-tanvi", dueOn: today, priority: r.priority, score: res.score + (sla.isFlagged ? 15 : 0), reason: sla.isFlagged ? `Untriaged ${sla.hoursElapsed}h (SLA 4h)` : "New request", overdueDays: 0 });
  }

  for (const l of state.leads) {
    if (l.deletedAt || l.stage === "won" || l.stage === "lost" || !l.nextFollowUpOn || l.nextFollowUpOn > today) continue;
    const res = calculatePriorityScore({ priority: "P2", dueOn: l.nextFollowUpOn, todayStr: today, weights });
    rows.push({ id: l.id, kind: "lead", title: `Follow up: ${l.businessName}${l.followUpNote ? ` — ${l.followUpNote}` : ""}`, clientName: "Sales lead", assigneeId: l.ownerId, dueOn: l.nextFollowUpOn, priority: "P2", score: res.score, reason: res.reasonSummary + " · sales follow-up", overdueDays: res.overdueDays });
  }

  return rows.sort((a, b) => b.score - a.score);
}

export function openTasksFor(state: AppState, userId?: string): TaskItem[] {
  return state.tasks.filter((t) => !t.deletedAt && t.status !== "done" && (!userId || t.assigneeId === userId));
}

export function unreadNotifications(state: AppState, userId: string) {
  return state.notifications.filter((n) => n.recipientId === userId && !n.readAt);
}

export function editingLoadByWeek(state: AppState, today: string): { weekStart: string; count: number; capacity: number }[] {
  const base = new Date(today);
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  const weeks: { weekStart: string; count: number; capacity: number }[] = [];
  for (let w = 0; w < 3; w++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    const count =
      state.content.filter((c) => !c.deletedAt && ["shot", "in_editing", "revision_requested"].includes(c.stage) && c.dueOn && c.dueOn >= s && c.dueOn <= e).length +
      state.tasks.filter((t) => !t.deletedAt && t.status !== "done" && t.title.startsWith("Edit:") && t.dueOn >= s && t.dueOn <= e).length;
    weeks.push({ weekStart: s, count, capacity: state.settings.healthThresholds.weeklyEditCapacity });
  }
  return weeks;
}

export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function fuzzyIncludes(hay: string, needle: string): boolean {
  const h = normalizeForSearch(hay);
  const n = normalizeForSearch(needle);
  if (!n) return true;
  if (h.includes(n)) return true;
  // common misspelling tolerance: strip doubled letters & vowels (Maa/Ma, Jewellers/Jewelers, Heaven/Haven)
  const squash = (x: string) => x.replace(/(.)\1+/g, "$1").replace(/[aeiou]/g, "");
  return squash(h).includes(squash(n));
}
