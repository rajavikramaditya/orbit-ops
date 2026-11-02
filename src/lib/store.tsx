"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
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
  ContentStage,
  Invoice,
  InvoiceLineItem,
  Lead,
  OnboardingStep,
  OneOffProject,
  PaymentRecord,
  Quotation,
  ShootDay,
  TaskItem,
  TeamProfile,
  UserRole,
} from "./types";
import {
  DEFAULT_ASSIGNEE_BY_STAGE,
  DEFAULT_SETTINGS,
  ONBOARDING_TEMPLATE,
  PACKAGES,
  TEAM,
  buildDemoDataset,
  DemoDataset,
} from "./demo-data";
import { Permission, assertCan } from "./rbac";
import { calculateInvoiceTotalsPaise, formatDocumentNumber, formatPaiseToINR } from "./business-rules";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export interface AppState extends DemoDataset {
  team: TeamProfile[];
  settings: AgencySettings;
  currentUserId: string;
  theme: "light" | "dark";
  version: number;
}

const STORAGE_KEY = "orbit-ops-state-v1";
const STATE_VERSION = 3;

function initialState(): AppState {
  return {
    ...buildDemoDataset(),
    team: TEAM,
    settings: DEFAULT_SETTINGS,
    currentUserId: "u-ram",
    theme: "light",
    version: STATE_VERSION,
  };
}

type Action =
  | { type: "HYDRATE"; state: AppState }
  | { type: "PATCH"; patch: Partial<AppState> }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "PATCH":
      return { ...state, ...action.patch };
    case "RESET":
      return initialState();
    default:
      return state;
  }
}

function nowIso() {
  return new Date().toISOString();
}
function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Context API
// ---------------------------------------------------------------------------
export interface StoreApi {
  state: AppState;
  currentUser: TeamProfile;
  role: UserRole;
  hydrated: boolean;
  today: string;
  can: (p: Permission) => boolean;
  switchUser: (id: string) => void;
  toggleTheme: () => void;
  resetAll: () => void;

  // clients
  addClient: (input: Partial<Client> & { officialName: string }, plan?: Partial<ClientPlan>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  softDelete: (entity: EntityKind, id: string) => void;
  restore: (entity: EntityKind, id: string) => void;
  permanentDelete: (entity: EntityKind, id: string) => void;
  deleteDemoData: () => void;
  addContact: (c: Omit<ClientContact, "id">) => void;
  addSocial: (s: Omit<ClientSocialAccount, "id">) => void;
  addAsset: (a: Omit<ClientBrandAsset, "id">) => void;
  upsertPlan: (p: Omit<ClientPlan, "id"> & { id?: string }) => void;
  addDocument: (d: Omit<ClientDocument, "id" | "createdAt" | "createdBy" | "version">) => void;
  toggleOnboardingStep: (stepId: string) => void;

  // content
  addContent: (c: Partial<ContentItem> & { clientId: string; title: string }) => ContentItem;
  updateContent: (id: string, patch: Partial<ContentItem>) => void;
  moveContentStage: (id: string, stage: ContentStage, note?: string) => void;

  // tasks
  addTask: (t: Partial<TaskItem> & { title: string }) => TaskItem;
  updateTask: (id: string, patch: Partial<TaskItem>) => void;
  completeTask: (id: string) => void;
  snoozeTask: (id: string) => void;

  // requests
  addRequest: (r: Partial<ClientRequest> & { clientId: string; body: string }) => ClientRequest;
  updateRequest: (id: string, patch: Partial<ClientRequest>) => void;
  convertRequest: (id: string, to: "task" | "content_item") => void;

  // projects
  addProject: (p: Partial<OneOffProject> & { clientId: string; name: string }) => OneOffProject;
  updateProject: (id: string, patch: Partial<OneOffProject>) => void;

  // shoots
  addShoot: (s: Partial<ShootDay> & { shootDate: string; location: string }) => ShootDay;
  updateShoot: (id: string, patch: Partial<ShootDay>) => void;
  completeShoot: (id: string) => { editingTasksCreated: number };

  // sales
  addLead: (l: Partial<Lead> & { businessName: string; contactName: string }) => Lead;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  winLead: (id: string, plan?: Partial<ClientPlan>) => Client;

  // money
  createInvoice: (input: { clientId: string; projectId?: string; items: Omit<InvoiceLineItem, "id" | "lineTotalPaise">[]; gstApplicable: boolean; dueDate: string; notes?: string }) => Invoice;
  createQuotation: (input: { recipientName: string; clientId?: string; leadId?: string; items: Omit<InvoiceLineItem, "id" | "lineTotalPaise">[]; gstApplicable: boolean; validUntil: string; notes?: string }) => Quotation;
  recordPayment: (p: Omit<PaymentRecord, "id" | "createdAt" | "createdBy">) => void;

  // misc
  addComment: (c: Omit<CommentItem, "id" | "createdAt" | "createdBy">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (patch: Partial<AgencySettings>) => void;
  updateTeamMember: (id: string, patch: Partial<TeamProfile>) => void;
  inviteTeamMember: (input: { name: string; email: string; role: UserRole; specialty?: string }) => void;
  importClientsCsv: (rows: Record<string, string>[]) => number;
  importTasksCsv: (rows: Record<string, string>[]) => number;
}

export type EntityKind =
  | "clients"
  | "content"
  | "tasks"
  | "requests"
  | "projects"
  | "shoots"
  | "leads"
  | "invoices"
  | "quotations"
  | "payments"
  | "documents"
  | "comments";

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, markHydrated] = useReducer(() => true, false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        if (parsed.version === STATE_VERSION) dispatch({ type: "HYDRATE", state: parsed });
      }
    } catch {
      /* ignore corrupted storage */
    }
    markHydrated();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const currentUser = useMemo(
    () => state.team.find((t) => t.id === state.currentUserId) ?? state.team[0],
    [state.team, state.currentUserId]
  );
  const role = currentUser.role;
  const today = todayYmd();

  const canFn = useCallback((p: Permission) => {
    try {
      assertCan(role, p);
      return true;
    } catch {
      return false;
    }
  }, [role]);

  // ---- internal helper: apply patch + audit log + bump client last activity
  const commit = useCallback(
    (
      patch: Partial<AppState>,
      log?: { entityType: string; entityId: string; clientId?: string; action: string; summary: string }
    ) => {
      const next: Partial<AppState> = { ...patch };
      if (log) {
        const entry: ActivityLogEntry = {
          id: genId("al"),
          entityType: log.entityType,
          entityId: log.entityId,
          clientId: log.clientId,
          actorId: state.currentUserId,
          action: log.action,
          summary: log.summary,
          at: nowIso(),
        };
        next.activity = [entry, ...(patch.activity ?? state.activity)];
        if (log.clientId) {
          const clients = patch.clients ?? state.clients;
          next.clients = clients.map((c) =>
            c.id === log.clientId ? { ...c, lastActivityAt: entry.at, updatedAt: entry.at } : c
          );
        }
      }
      dispatch({ type: "PATCH", patch: next });
    },
    [state]
  );

  const api: StoreApi = useMemo(() => {
    const s = state;
    const uid = s.currentUserId;
    const clientName = (id?: string) => s.clients.find((c) => c.id === id)?.displayName ?? "—";

    const collectionOf = (kind: EntityKind) => {
      const map: Record<EntityKind, keyof AppState> = {
        clients: "clients",
        content: "content",
        tasks: "tasks",
        requests: "requests",
        projects: "projects",
        shoots: "shoots",
        leads: "leads",
        invoices: "invoices",
        quotations: "quotations",
        payments: "payments",
        documents: "documents",
        comments: "comments",
      };
      return map[kind];
    };

    const buildOnboarding = (clientId: string, startYmd: string): OnboardingStep[] =>
      ONBOARDING_TEMPLATE.map((t, idx) => {
        const d = new Date(startYmd);
        d.setDate(d.getDate() + t.offsetDays);
        return {
          id: genId("ob"),
          clientId,
          stepOrder: idx + 1,
          step: t.step,
          ownerId: t.ownerId,
          dueOn: d.toISOString().slice(0, 10),
          doneAt: idx === 0 ? nowIso() : undefined,
        };
      });

    const makeClient = (input: Partial<Client> & { officialName: string }, plan?: Partial<ClientPlan>, extraFn?: (newClientId: string) => Partial<AppState>) => {
      const id = genId("c");
      const extra = extraFn?.(id);
      const ts = nowIso();
      const client: Client = {
        id,
        organizationId: s.clients[0]?.organizationId ?? "org",
        displayName: input.displayName || input.officialName,
        aliases: input.aliases ?? [],
        wrongSpellings: input.wrongSpellings ?? [],
        status: input.status ?? "onboarding",
        engagementType: input.engagementType ?? "retainer",
        industry: input.industry ?? "",
        city: input.city ?? "Orai",
        languagePref: input.languagePref ?? "Hinglish",
        ownerId: input.ownerId ?? uid,
        portalToken: genId("portal"),
        lastActivityAt: ts,
        isDemo: false,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
        onboardedOn: input.onboardedOn ?? today,
        ...input,
      };
      const newPlan: ClientPlan | null = plan
        ? {
            id: genId("pl"),
            clientId: id,
            packageTemplateId: plan.packageTemplateId,
            packageName: plan.packageName ?? "8 videos / month",
            monthlyFeePaise: plan.monthlyFeePaise ?? 0,
            videosPerCycle: plan.videosPerCycle ?? 8,
            otherDeliverables: plan.otherDeliverables ?? [],
            cycleDay: plan.cycleDay ?? 1,
            startsOn: plan.startsOn ?? today,
            gstApplicable: plan.gstApplicable ?? true,
            active: true,
          }
        : null;
      commit(
        {
          ...extra,
          clients: [client, ...(extra?.clients ?? s.clients)],
          plans: newPlan ? [newPlan, ...s.plans] : s.plans,
          onboarding: [...s.onboarding, ...buildOnboarding(id, client.onboardedOn ?? today)],
        },
        { entityType: "client", entityId: id, clientId: id, action: "created", summary: `Client "${client.officialName}" created · onboarding checklist generated` }
      );
      return client;
    };

    return {
      state: s,
      currentUser,
      role,
      hydrated,
      today,
      can: canFn,
      switchUser: (id) => dispatch({ type: "PATCH", patch: { currentUserId: id } }),
      toggleTheme: () => dispatch({ type: "PATCH", patch: { theme: s.theme === "dark" ? "light" : "dark" } }),
      resetAll: () => dispatch({ type: "RESET" }),

      addClient: (input, plan) => {
        assertCan(role, "manage_clients");
        return makeClient(input, plan);
      },
      updateClient: (id, patch) => {
        assertCan(role, "manage_clients");
        commit(
          { clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c)) },
          { entityType: "client", entityId: id, clientId: id, action: "updated", summary: `Updated client profile (${Object.keys(patch).join(", ")})` }
        );
      },
      softDelete: (kind, id) => {
        assertCan(role, kind === "clients" ? "manage_clients" : "manage_tasks");
        const key = collectionOf(kind);
        const list = s[key] as Array<{ id: string; deletedAt?: string | null; clientId?: string }>;
        const item = list.find((x) => x.id === id);
        commit(
          { [key]: list.map((x) => (x.id === id ? { ...x, deletedAt: nowIso() } : x)) } as Partial<AppState>,
          { entityType: kind, entityId: id, clientId: kind === "clients" ? id : item?.clientId, action: "soft_deleted", summary: `Moved ${kind.replace(/s$/, "")} to Trash` }
        );
      },
      restore: (kind, id) => {
        assertCan(role, "restore_trash");
        const key = collectionOf(kind);
        const list = s[key] as Array<{ id: string; deletedAt?: string | null; clientId?: string }>;
        const item = list.find((x) => x.id === id);
        commit(
          { [key]: list.map((x) => (x.id === id ? { ...x, deletedAt: null } : x)) } as Partial<AppState>,
          { entityType: kind, entityId: id, clientId: kind === "clients" ? id : item?.clientId, action: "restored", summary: `Restored ${kind.replace(/s$/, "")} from Trash` }
        );
      },
      permanentDelete: (kind, id) => {
        assertCan(role, "permanent_delete");
        const key = collectionOf(kind);
        const list = s[key] as Array<{ id: string }>;
        commit(
          { [key]: list.filter((x) => x.id !== id) } as Partial<AppState>,
          { entityType: kind, entityId: id, action: "permanently_deleted", summary: `Permanently deleted ${kind.replace(/s$/, "")}` }
        );
      },
      deleteDemoData: () => {
        assertCan(role, "manage_settings");
        const demoIds = new Set(s.clients.filter((c) => c.isDemo).map((c) => c.id));
        const notDemo = <T extends { clientId?: string }>(arr: T[]) => arr.filter((x) => !x.clientId || !demoIds.has(x.clientId));
        commit(
          {
            clients: s.clients.filter((c) => !c.isDemo),
            contacts: notDemo(s.contacts),
            socials: notDemo(s.socials),
            assets: notDemo(s.assets),
            plans: notDemo(s.plans),
            content: notDemo(s.content),
            tasks: notDemo(s.tasks),
            requests: notDemo(s.requests),
            projects: notDemo(s.projects),
            onboarding: notDemo(s.onboarding),
            invoices: notDemo(s.invoices),
            payments: notDemo(s.payments),
            documents: notDemo(s.documents),
            comments: notDemo(s.comments),
            shoots: s.shoots.map((sh) => ({ ...sh, items: sh.items.filter((i) => !demoIds.has(i.clientId)) })).filter((sh) => sh.items.length > 0),
            leads: s.leads.filter((l) => !l.referredByClientId || !demoIds.has(l.referredByClientId)).filter((l) => !l.id.startsWith("l-00")),
            quotations: s.quotations.filter((q) => !q.id.startsWith("q-")),
            notifications: [],
          },
          { entityType: "system", entityId: "demo", action: "demo_deleted", summary: `Deleted ${demoIds.size} demo clients and all their data` }
        );
      },
      addContact: (c) => commit({ contacts: [...s.contacts, { ...c, id: genId("ct") }] }, { entityType: "client", entityId: c.clientId, clientId: c.clientId, action: "contact_added", summary: `Added contact ${c.name}` }),
      addSocial: (so) => commit({ socials: [...s.socials, { ...so, id: genId("so") }] }, { entityType: "client", entityId: so.clientId, clientId: so.clientId, action: "social_added", summary: `Added ${so.platform} handle ${so.handle}` }),
      addAsset: (a) => commit({ assets: [...s.assets, { ...a, id: genId("as") }] }, { entityType: "client", entityId: a.clientId, clientId: a.clientId, action: "asset_added", summary: `Added brand asset "${a.title}"` }),
      upsertPlan: (p) => {
        assertCan(role, "manage_money");
        const existing = p.id ? s.plans.find((x) => x.id === p.id) : s.plans.find((x) => x.clientId === p.clientId && x.active);
        const plan: ClientPlan = { ...p, id: existing?.id ?? genId("pl") };
        commit(
          { plans: existing ? s.plans.map((x) => (x.id === existing.id ? plan : x)) : [...s.plans, plan] },
          { entityType: "client", entityId: p.clientId, clientId: p.clientId, action: "plan_updated", summary: `Package set to ${plan.packageName} · ${formatPaiseToINR(plan.monthlyFeePaise)}/month` }
        );
      },
      addDocument: (d) => {
        const prevVersions = s.documents.filter((x) => x.clientId === d.clientId && x.title === d.title).length;
        commit(
          { documents: [{ ...d, id: genId("doc"), version: prevVersions + 1, createdBy: uid, createdAt: nowIso() }, ...s.documents] },
          { entityType: "document", entityId: d.clientId, clientId: d.clientId, action: "document_added", summary: `Added document "${d.title}" v${prevVersions + 1}` }
        );
      },
      toggleOnboardingStep: (stepId) => {
        const step = s.onboarding.find((o) => o.id === stepId);
        if (!step) return;
        const done = !step.doneAt;
        const updated = s.onboarding.map((o) => (o.id === stepId ? { ...o, doneAt: done ? nowIso() : undefined } : o));
        const allDone = updated.filter((o) => o.clientId === step.clientId).every((o) => o.doneAt);
        const clients = allDone
          ? s.clients.map((c) => (c.id === step.clientId && c.status === "onboarding" ? { ...c, status: "active" as const } : c))
          : s.clients;
        commit(
          { onboarding: updated, clients },
          { entityType: "onboarding", entityId: stepId, clientId: step.clientId, action: done ? "step_done" : "step_reopened", summary: `${done ? "Completed" : "Reopened"} onboarding step "${step.step}"${allDone ? " · client is now Active" : ""}` }
        );
      },

      addContent: (c) => {
        assertCan(role, "manage_content");
        const ts = nowIso();
        const stage = c.stage ?? "idea";
        const item: ContentItem = {
          id: genId("ci"),
          type: "reel",
          referenceLinks: [],
          platforms: ["Instagram"],
          revisionCount: 0,
          assigneeId: c.assigneeId ?? DEFAULT_ASSIGNEE_BY_STAGE[stage],
          stage,
          stageChangedAt: ts,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
          ...c,
        } as ContentItem;
        commit({ content: [item, ...s.content] }, { entityType: "content_item", entityId: item.id, clientId: item.clientId, action: "created", summary: `Added ${item.type} "${item.title}"` });
        return item;
      },
      updateContent: (id, patch) => {
        assertCan(role, "manage_content");
        const item = s.content.find((x) => x.id === id);
        commit(
          { content: s.content.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x)) },
          { entityType: "content_item", entityId: id, clientId: item?.clientId, action: "updated", summary: `Updated "${item?.title}" (${Object.keys(patch).join(", ")})` }
        );
      },
      moveContentStage: (id, stage, note) => {
        assertCan(role, "manage_content");
        const item = s.content.find((x) => x.id === id);
        if (!item) return;
        const ts = nowIso();
        const patch: Partial<ContentItem> = {
          stage,
          stageChangedAt: ts,
          assigneeId: DEFAULT_ASSIGNEE_BY_STAGE[stage] ?? item.assigneeId,
          updatedAt: ts,
        };
        if (stage === "posted") patch.postedAt = ts;
        if (stage === "revision_requested") {
          patch.revisionCount = item.revisionCount + 1;
          if (note) patch.feedbackNotes = note;
        }
        commit(
          { content: s.content.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
          { entityType: "content_item", entityId: id, clientId: item.clientId, action: "stage_changed", summary: `Moved "${item.title}" to ${STAGE_LABEL[stage]}${stage === "revision_requested" ? ` (revision #${item.revisionCount + 1})` : ""}` }
        );
      },

      addTask: (t) => {
        assertCan(role, "manage_tasks");
        const ts = nowIso();
        const task: TaskItem = {
          id: genId("t"),
          assigneeId: t.assigneeId ?? uid,
          priority: t.priority ?? "P2",
          dueOn: t.dueOn ?? today,
          status: "todo",
          checklist: [],
          estimatedHours: 1,
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
          ...t,
        } as TaskItem;
        commit({ tasks: [task, ...s.tasks] }, { entityType: "task", entityId: task.id, clientId: task.clientId, action: "created", summary: `Added task "${task.title}" (${task.priority})` });
        return task;
      },
      updateTask: (id, patch) => {
        assertCan(role, "manage_tasks");
        const t = s.tasks.find((x) => x.id === id);
        commit(
          { tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x)) },
          { entityType: "task", entityId: id, clientId: t?.clientId, action: "updated", summary: `Updated task "${t?.title}" (${Object.keys(patch).join(", ")})` }
        );
      },
      completeTask: (id) => {
        assertCan(role, "manage_tasks");
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        const ts = nowIso();
        let tasks = s.tasks.map((x) => (x.id === id ? { ...x, status: "done" as const, completedAt: ts, updatedAt: ts } : x));
        // Recurring tasks spawn the next occurrence
        if (t.recurrence) {
          const d = new Date(t.dueOn);
          if (t.recurrence === "weekly") d.setDate(d.getDate() + 7);
          else d.setMonth(d.getMonth() + 1);
          tasks = [{ ...t, id: genId("t"), status: "todo", completedAt: undefined, dueOn: d.toISOString().slice(0, 10), createdAt: ts, updatedAt: ts }, ...tasks];
        }
        commit({ tasks }, { entityType: "task", entityId: id, clientId: t.clientId, action: "completed", summary: `Completed "${t.title}"${t.recurrence ? ` · next ${t.recurrence} occurrence created` : ""}` });
      },
      snoozeTask: (id) => {
        assertCan(role, "manage_tasks");
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        const tomorrow = d.toISOString().slice(0, 10);
        commit(
          { tasks: s.tasks.map((x) => (x.id === id ? { ...x, dueOn: tomorrow, snoozedUntil: tomorrow, updatedAt: nowIso() } : x)) },
          { entityType: "task", entityId: id, clientId: t.clientId, action: "snoozed", summary: `Snoozed "${t.title}" to tomorrow` }
        );
      },

      addRequest: (r) => {
        const ts = nowIso();
        const req: ClientRequest = {
          id: genId("r"),
          channel: "call",
          receivedAt: ts,
          loggedBy: uid,
          priority: "P2",
          triageStatus: "new",
          attachments: [],
          createdAt: ts,
          deletedAt: null,
          ...r,
        } as ClientRequest;
        commit({ requests: [req, ...s.requests] }, { entityType: "request", entityId: req.id, clientId: req.clientId, action: "created", summary: `Logged ${req.channel} request from ${clientName(req.clientId)}` });
        return req;
      },
      updateRequest: (id, patch) => {
        assertCan(role, "triage_requests");
        const r = s.requests.find((x) => x.id === id);
        commit(
          { requests: s.requests.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
          { entityType: "request", entityId: id, clientId: r?.clientId, action: "triaged", summary: `Triaged request (${Object.keys(patch).join(", ")})` }
        );
      },
      convertRequest: (id, to) => {
        assertCan(role, "triage_requests");
        const r = s.requests.find((x) => x.id === id);
        if (!r) return;
        const ts = nowIso();
        const title = r.body.length > 70 ? r.body.slice(0, 67) + "…" : r.body;
        let patch: Partial<AppState> = {};
        let newId = "";
        if (to === "task") {
          newId = genId("t");
          const task: TaskItem = { id: newId, clientId: r.clientId, title, description: r.body, assigneeId: r.assigneeId ?? "u-tanvi", priority: r.priority, dueOn: r.dueOn ?? today, status: "todo", checklist: [], estimatedHours: 1, createdAt: ts, updatedAt: ts, deletedAt: null };
          patch = { tasks: [task, ...s.tasks] };
        } else {
          newId = genId("ci");
          const item: ContentItem = { id: newId, clientId: r.clientId, type: "reel", title, script: r.body, referenceLinks: [], stage: "idea", stageChangedAt: ts, assigneeId: r.assigneeId ?? "u-tanvi", dueOn: r.dueOn, platforms: ["Instagram"], revisionCount: 0, createdAt: ts, updatedAt: ts, deletedAt: null };
          patch = { content: [item, ...s.content] };
        }
        commit(
          { ...patch, requests: s.requests.map((x) => (x.id === id ? { ...x, triageStatus: "in_progress", convertedToType: to, convertedToId: newId } : x)) },
          { entityType: "request", entityId: id, clientId: r.clientId, action: "converted", summary: `Converted request into ${to === "task" ? "task" : "content item"}` }
        );
      },

      addProject: (p) => {
        assertCan(role, "manage_projects");
        const ts = nowIso();
        const project: OneOffProject = { id: genId("p"), scope: "", pricePaise: 0, deliverablesChecklist: [], revisionCount: 0, status: "brief_received", assigneeId: "u-prathmes", dueOn: today, files: [], createdAt: ts, updatedAt: ts, deletedAt: null, ...p } as OneOffProject;
        commit({ projects: [project, ...s.projects] }, { entityType: "project", entityId: project.id, clientId: project.clientId, action: "created", summary: `Added project "${project.name}" (${formatPaiseToINR(project.pricePaise)})` });
        return project;
      },
      updateProject: (id, patch) => {
        assertCan(role, "manage_projects");
        const p = s.projects.find((x) => x.id === id);
        commit(
          { projects: s.projects.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x)) },
          { entityType: "project", entityId: id, clientId: p?.clientId, action: patch.status ? "status_changed" : "updated", summary: patch.status ? `Project "${p?.name}" → ${PROJECT_STATUS_LABEL[patch.status]}` : `Updated project "${p?.name}"` }
        );
      },

      addShoot: (sh) => {
        assertCan(role, "manage_shoots");
        const shoot: ShootDay = { id: genId("sh"), startTime: "10:00 AM", crew: ["u-tosseeb", "u-rohit"], status: "planned", items: [], createdAt: nowIso(), deletedAt: null, ...sh } as ShootDay;
        const content = s.content.map((c) => (shoot.items.some((i) => i.contentItemId === c.id) ? { ...c, shootId: shoot.id, plannedShootOn: shoot.shootDate, stage: c.stage === "idea" ? ("planned_for_shoot" as const) : c.stage } : c));
        commit({ shoots: [shoot, ...s.shoots], content }, { entityType: "shoot", entityId: shoot.id, action: "created", summary: `Planned shoot day on ${shoot.shootDate} at ${shoot.location}` });
        return shoot;
      },
      updateShoot: (id, patch) => {
        assertCan(role, "manage_shoots");
        commit({ shoots: s.shoots.map((x) => (x.id === id ? { ...x, ...patch } : x)) }, { entityType: "shoot", entityId: id, action: "updated", summary: `Updated shoot day` });
      },
      completeShoot: (id) => {
        assertCan(role, "manage_shoots");
        const shoot = s.shoots.find((x) => x.id === id);
        if (!shoot) return { editingTasksCreated: 0 };
        const ts = nowIso();
        const itemIds = new Set(shoot.items.map((i) => i.contentItemId).filter(Boolean));
        const dueDate = new Date(shoot.shootDate);
        dueDate.setDate(dueDate.getDate() + 3);
        const due = dueDate.toISOString().slice(0, 10);
        const newTasks: TaskItem[] = [];
        const content = s.content.map((c) => {
          if (!itemIds.has(c.id)) return c;
          newTasks.push({ id: genId("t"), clientId: c.clientId, contentItemId: c.id, title: `Edit: ${c.title}`, assigneeId: "u-prathmes", priority: "P2", dueOn: due, status: "todo", checklist: [{ id: "k1", text: "Rough cut", done: false }, { id: "k2", text: "Colour + audio", done: false }, { id: "k3", text: "Export 1080x1920", done: false }], estimatedHours: 3, createdAt: ts, updatedAt: ts, deletedAt: null });
          return { ...c, stage: "shot" as const, stageChangedAt: ts, assigneeId: "u-prathmes", updatedAt: ts };
        });
        const touched = Array.from(new Set(shoot.items.map((i) => i.clientId)));
        const activity: ActivityLogEntry[] = touched.map((cid) => ({ id: genId("al"), entityType: "shoot", entityId: id, clientId: cid, actorId: uid, action: "shoot_completed", summary: `Shoot completed · items moved to Shot · editing tasks created for Prathmes (due ${due})`, at: ts }));
        const clients = s.clients.map((c) => (touched.includes(c.id) ? { ...c, lastActivityAt: ts } : c));
        commit({ shoots: s.shoots.map((x) => (x.id === id ? { ...x, status: "completed" } : x)), content, tasks: [...newTasks, ...s.tasks], activity: [...activity, ...s.activity], clients });
        return { editingTasksCreated: newTasks.length };
      },

      addLead: (l) => {
        assertCan(role, "manage_sales");
        const ts = nowIso();
        const lead: Lead = { id: genId("l"), phone: "", city: "Orai", industry: "", source: "outreach", serviceInterest: "", estimatedValuePaise: 0, ownerId: uid, stage: "new_lead", createdAt: ts, updatedAt: ts, deletedAt: null, ...l } as Lead;
        commit({ leads: [lead, ...s.leads] }, { entityType: "lead", entityId: lead.id, action: "created", summary: `New lead: ${lead.businessName}` });
        return lead;
      },
      updateLead: (id, patch) => {
        assertCan(role, "manage_sales");
        const l = s.leads.find((x) => x.id === id);
        commit({ leads: s.leads.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: nowIso() } : x)) }, { entityType: "lead", entityId: id, action: patch.stage ? "stage_changed" : "updated", summary: patch.stage ? `Lead "${l?.businessName}" → ${LEAD_STAGE_LABEL[patch.stage]}` : `Updated lead "${l?.businessName}"` });
      },
      winLead: (id, plan) => {
        assertCan(role, "manage_sales");
        const l = s.leads.find((x) => x.id === id)!;
        return makeClient(
          { officialName: l.businessName, industry: l.industry, city: l.city, ownerId: l.ownerId, researchGaps: l.weaknessesAndGaps, researchCompetitors: l.competitorFindings, notes: `Converted from lead · source: ${l.source}` },
          plan ?? { packageName: "8 videos / month", videosPerCycle: 8, monthlyFeePaise: l.estimatedValuePaise, cycleDay: Math.min(28, new Date().getDate()) },
          (newClientId) => ({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage: "won", convertedClientId: newClientId, updatedAt: nowIso() } : x)) })
        );
      },

      createInvoice: (input) => {
        assertCan(role, "manage_money");
        const totals = calculateInvoiceTotalsPaise(input.items, input.gstApplicable, s.settings.defaultGstRate);
        const year = new Date().getFullYear();
        const number = formatDocumentNumber(s.settings.invoicePrefix, year, s.settings.nextInvoiceSeq);
        const inv: Invoice = {
          id: genId("inv"),
          clientId: input.clientId,
          projectId: input.projectId,
          invoiceNumber: number,
          issueDate: today,
          dueDate: input.dueDate,
          gstApplicable: input.gstApplicable,
          gstRatePercent: s.settings.defaultGstRate,
          items: input.items.map((i) => ({ ...i, id: genId("li"), lineTotalPaise: i.quantity * i.unitPricePaise })),
          ...totals,
          notes: input.notes,
          status: "issued",
          createdAt: nowIso(),
          deletedAt: null,
        };
        commit(
          { invoices: [inv, ...s.invoices], settings: { ...s.settings, nextInvoiceSeq: s.settings.nextInvoiceSeq + 1 } },
          { entityType: "invoice", entityId: inv.id, clientId: inv.clientId, action: "created", summary: `Invoice ${number} issued · ${formatPaiseToINR(inv.totalPaise)}` }
        );
        return inv;
      },
      createQuotation: (input) => {
        assertCan(role, "manage_money");
        const totals = calculateInvoiceTotalsPaise(input.items, input.gstApplicable, s.settings.defaultGstRate);
        const year = new Date().getFullYear();
        const number = formatDocumentNumber(s.settings.quotationPrefix, year, s.settings.nextQuotationSeq);
        const q: Quotation = {
          id: genId("q"),
          clientId: input.clientId,
          leadId: input.leadId,
          recipientName: input.recipientName,
          quotationNumber: number,
          issueDate: today,
          validUntil: input.validUntil,
          gstApplicable: input.gstApplicable,
          gstRatePercent: s.settings.defaultGstRate,
          items: input.items.map((i) => ({ ...i, id: genId("qi"), lineTotalPaise: i.quantity * i.unitPricePaise })),
          ...totals,
          status: "sent",
          notes: input.notes,
          createdAt: nowIso(),
          deletedAt: null,
        };
        commit(
          { quotations: [q, ...s.quotations], settings: { ...s.settings, nextQuotationSeq: s.settings.nextQuotationSeq + 1 } },
          { entityType: "quotation", entityId: q.id, clientId: q.clientId, action: "created", summary: `Quotation ${number} sent to ${q.recipientName} · ${formatPaiseToINR(q.totalPaise)}` }
        );
        return q;
      },
      recordPayment: (p) => {
        assertCan(role, "manage_money");
        const pay: PaymentRecord = { ...p, id: genId("pay"), createdBy: uid, createdAt: nowIso() };
        const payments = [pay, ...s.payments];
        // Recompute invoice status exactly (paise integers)
        const invoices = s.invoices.map((inv) => {
          if (inv.id !== p.invoiceId) return inv;
          const paid = payments.filter((x) => x.invoiceId === inv.id && !x.deletedAt).reduce((a, x) => a + x.amountPaise, 0);
          const status: Invoice["status"] = paid >= inv.totalPaise ? "paid" : paid > 0 ? "partially_paid" : inv.status;
          return { ...inv, status };
        });
        // Payment fully received on a project → project marked Paid
        const projects = s.projects.map((pr) => {
          if (pr.id !== p.projectId) return pr;
          const paid = payments.filter((x) => x.projectId === pr.id && !x.deletedAt).reduce((a, x) => a + x.amountPaise, 0);
          return paid >= pr.pricePaise ? { ...pr, status: "paid" as const, updatedAt: nowIso() } : pr;
        });
        commit({ payments, invoices, projects }, { entityType: "payment", entityId: pay.id, clientId: pay.clientId, action: "created", summary: `Recorded payment ${formatPaiseToINR(pay.amountPaise)} (${pay.method})` });
      },

      addComment: (c) => {
        const comment: CommentItem = { ...c, id: genId("cm"), createdBy: uid, createdAt: nowIso() };
        const notifications = [
          ...c.mentions.filter((m) => m !== uid).map((m) => ({ id: genId("nt"), recipientId: m, title: "You were mentioned", body: `${currentUser.name}: ${c.body.slice(0, 80)}`, channel: "in_app" as const, createdAt: nowIso() })),
          ...s.notifications,
        ];
        commit({ comments: [comment, ...s.comments], notifications }, { entityType: c.entityType, entityId: c.entityId, clientId: c.clientId, action: "commented", summary: `Comment: ${c.body.slice(0, 60)}${c.body.length > 60 ? "…" : ""}` });
      },
      markNotificationRead: (id) => dispatch({ type: "PATCH", patch: { notifications: s.notifications.map((n) => (n.id === id ? { ...n, readAt: nowIso() } : n)) } }),
      markAllNotificationsRead: () => dispatch({ type: "PATCH", patch: { notifications: s.notifications.map((n) => (n.recipientId === uid ? { ...n, readAt: n.readAt ?? nowIso() } : n)) } }),
      updateSettings: (patch) => {
        assertCan(role, "manage_settings");
        commit({ settings: { ...s.settings, ...patch } }, { entityType: "settings", entityId: "org", action: "updated", summary: `Settings updated (${Object.keys(patch).join(", ")})` });
      },
      updateTeamMember: (id, patch) => {
        assertCan(role, "manage_users");
        commit({ team: s.team.map((t) => (t.id === id ? { ...t, ...patch } : t)) }, { entityType: "user", entityId: id, action: "updated", summary: `Updated user (${Object.keys(patch).join(", ")})` });
      },
      inviteTeamMember: (input) => {
        assertCan(role, "manage_users");
        const member: TeamProfile = { id: genId("u"), organizationId: s.team[0].organizationId, name: input.name, email: input.email, role: input.role, specialty: input.specialty ?? "", phone: "", active: true, twoFactorEnabled: false };
        commit({ team: [...s.team, member] }, { entityType: "user", entityId: member.id, action: "invited", summary: `Invited ${input.name} (${input.email}) as ${input.role}` });
      },
      importClientsCsv: (rows) => {
        assertCan(role, "manage_clients");
        let count = 0;
        const ts = nowIso();
        const newClients: Client[] = [];
        const newPlans: ClientPlan[] = [];
        const newOnboarding: OnboardingStep[] = [];
        for (const r of rows) {
          const name = (r.official_name || r.name || "").trim();
          if (!name) continue;
          const id = genId("c");
          const pkg = PACKAGES.find((p) => p.name.toLowerCase() === (r.package || "").toLowerCase()) ?? PACKAGES[0];
          newClients.push({ id, organizationId: s.team[0].organizationId, officialName: name, displayName: r.display_name?.trim() || name, aliases: (r.aliases || "").split("|").map((x) => x.trim()).filter(Boolean), wrongSpellings: (r.wrong_spellings || "").split("|").map((x) => x.trim()).filter(Boolean), status: (r.status as Client["status"]) || "onboarding", engagementType: (r.engagement_type as Client["engagementType"]) || "retainer", industry: r.industry || "", city: r.city || "Orai", address: r.address, mapsUrl: r.maps_url, gstNo: r.gst_no, website: r.website, tagline: r.tagline, languagePref: (r.language_pref as Client["languagePref"]) || "Hinglish", onboardedOn: r.onboarded_on || today, ownerId: s.team.find((t) => t.name.toLowerCase().startsWith((r.owner || "").toLowerCase()) && r.owner)?.id ?? uid, portalToken: genId("portal"), lastActivityAt: ts, isDemo: false, createdAt: ts, updatedAt: ts, deletedAt: null });
          newPlans.push({ id: genId("pl"), clientId: id, packageTemplateId: pkg.id, packageName: pkg.name, monthlyFeePaise: Math.round(Number(r.monthly_fee_rupees || 0) * 100), videosPerCycle: Number(r.videos_per_cycle || pkg.videosPerCycle || 8), otherDeliverables: pkg.otherDeliverables, cycleDay: Math.min(28, Math.max(1, Number(r.cycle_day || 1))), startsOn: r.onboarded_on || today, gstApplicable: (r.gst_applicable || "yes").toLowerCase() !== "no", active: true });
          newOnboarding.push(...buildOnboarding(id, r.onboarded_on || today));
          count++;
        }
        commit({ clients: [...newClients, ...s.clients], plans: [...newPlans, ...s.plans], onboarding: [...s.onboarding, ...newOnboarding] }, { entityType: "import", entityId: "clients", action: "imported", summary: `Imported ${count} clients from CSV` });
        return count;
      },
      importTasksCsv: (rows) => {
        assertCan(role, "manage_tasks");
        const ts = nowIso();
        const newTasks: TaskItem[] = [];
        for (const r of rows) {
          if (!r.title?.trim()) continue;
          const client = s.clients.find((c) => c.officialName.toLowerCase() === (r.client || "").toLowerCase().trim() || c.aliases.some((a) => a.toLowerCase() === (r.client || "").toLowerCase().trim()));
          const assignee = s.team.find((t) => t.name.toLowerCase() === (r.assignee || "").toLowerCase().trim());
          newTasks.push({ id: genId("t"), clientId: client?.id, title: r.title.trim(), description: r.description, assigneeId: assignee?.id ?? uid, priority: (["P1", "P2", "P3"].includes(r.priority) ? r.priority : "P2") as TaskItem["priority"], dueOn: r.due_on || today, status: "todo", checklist: [], estimatedHours: Number(r.estimated_hours || 1), createdAt: ts, updatedAt: ts, deletedAt: null });
        }
        commit({ tasks: [...newTasks, ...s.tasks] }, { entityType: "import", entityId: "tasks", action: "imported", summary: `Imported ${newTasks.length} tasks from CSV` });
        return newTasks.length;
      },
    };
  }, [state, currentUser, role, hydrated, today, canFn, commit]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
export const STAGE_ORDER: ContentStage[] = ["idea", "planned_for_shoot", "shot", "in_editing", "ready_for_approval", "approved", "scheduled", "posted"];
export const STAGE_LABEL: Record<ContentStage, string> = {
  idea: "Idea",
  planned_for_shoot: "Planned for shoot",
  shot: "Shot",
  in_editing: "In editing",
  ready_for_approval: "Ready for approval",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  revision_requested: "Revision requested",
  dropped: "Dropped",
};
export const PROJECT_STATUS_ORDER: OneOffProject["status"][] = ["brief_received", "working", "in_review", "revisions", "delivered", "paid"];
export const PROJECT_STATUS_LABEL: Record<OneOffProject["status"], string> = {
  brief_received: "Brief received",
  working: "Working",
  in_review: "In review",
  revisions: "Revisions",
  delivered: "Delivered",
  paid: "Paid",
};
export const LEAD_STAGE_ORDER: Lead["stage"][] = ["new_lead", "research", "proposal_sent", "follow_up", "negotiation", "won", "lost"];
export const LEAD_STAGE_LABEL: Record<Lead["stage"], string> = {
  new_lead: "New lead",
  research: "Research",
  proposal_sent: "Proposal sent",
  follow_up: "Follow-up",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};
export const TASK_STATUS_LABEL: Record<TaskItem["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  waiting_on_client: "Waiting on client",
  done: "Done",
};
export const CLIENT_STATUS_LABEL: Record<Client["status"], string> = {
  onboarding: "Onboarding",
  active: "Active",
  paused: "Paused",
  churned: "Churned",
};
