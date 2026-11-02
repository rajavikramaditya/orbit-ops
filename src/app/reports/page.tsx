"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useStore, STAGE_LABEL } from "@/lib/store";
import { useMetrics } from "@/lib/hooks";
import { Button, Card, DateText, Field, HealthDot, PageHeader, Pill, Select, Stat, Tabs, Textarea, cn } from "@/components/ui";
import { formatDateDDMMYYYY, formatPaiseToINR, getClientCycleWindow } from "@/lib/business-rules";
import { Forbidden } from "@/components/Forbidden";
import { invoicePaid } from "@/components/MoneyClientPanel";
import { toCsv, downloadText } from "@/lib/export";

type Tab = "weekly" | "monthly" | "exports";

export default function ReportsPage() {
  const store = useStore();
  const { metrics } = useMetrics();
  const [tab, setTab] = useState<Tab>("weekly");
  if (!store.can("view_reports")) return <Forbidden what="Reports" />;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Weekly review for the Monday meeting · monthly client report (white-label) · CSV exports" actions={<Button variant="ghost" onClick={() => window.print()}><Printer size={16} /> Print / PDF</Button>} />
      <div className="no-print"><Tabs tabs={[{ id: "weekly", label: "Weekly review" }, { id: "monthly", label: "Monthly client report" }, { id: "exports", label: "CSV exports" }]} value={tab} onChange={setTab} /></div>
      {tab === "weekly" && <WeeklyReview metrics={metrics} />}
      {tab === "monthly" && <MonthlyReport />}
      {tab === "exports" && <Exports />}
    </div>
  );
}

function WeeklyReview({ metrics }: { metrics: ReturnType<typeof useMetrics>["metrics"] }) {
  const store = useStore();
  const weekAgo = (() => { const d = new Date(store.today); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const newLeads = store.state.leads.filter((l) => !l.deletedAt && l.createdAt.slice(0, 10) >= weekAgo).length;
  const collected = store.state.payments.filter((p) => !p.deletedAt && p.paidOn >= weekAgo).reduce((a, p) => a + p.amountPaise, 0);
  const pendingApprovals = store.state.content.filter((c) => !c.deletedAt && c.stage === "ready_for_approval").length;
  const overdueTotal = store.state.tasks.filter((t) => !t.deletedAt && t.status !== "done" && t.dueOn < store.today).length + store.state.content.filter((c) => !c.deletedAt && c.dueOn && c.dueOn < store.today && !["posted", "dropped"].includes(c.stage)).length;
  const postedThisWeek = store.state.content.filter((c) => !c.deletedAt && c.stage === "posted" && (c.postedAt ?? "").slice(0, 10) >= weekAgo).length;

  return (
    <div className="print-page space-y-4">
      <div className="hidden print:block mb-4"><p className="text-xs uppercase tracking-widest">Orbit Media by Orbitcore</p><h1 className="text-2xl font-semibold">Weekly review — {formatDateDDMMYYYY(store.today)}</h1></div>
      <div className="grid gap-3 sm:grid-cols-5">
        <Stat label="Posted this week" value={postedThisWeek} tone="green" />
        <Stat label="Overdue items" value={overdueTotal} tone={overdueTotal ? "red" : "green"} />
        <Stat label="Pending approvals" value={pendingApprovals} tone={pendingApprovals ? "amber" : undefined} />
        <Stat label="New leads" value={store.can("view_sales") ? newLeads : "—"} />
        <Stat label="Collected (7d)" value={store.can("view_money") ? formatPaiseToINR(collected) : "—"} tone="green" />
      </div>
      <Card title="Per client · delivered vs promised this cycle" padded={false}>
        <div className="scroll-x">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="text-xs uppercase tracking-wide muted text-left"><tr className="border-b"><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Health</th><th className="px-4 py-2.5">Cycle</th><th className="px-4 py-2.5 text-right">Posted / promised</th><th className="px-4 py-2.5 text-right">Expected</th><th className="px-4 py-2.5">Schedule</th><th className="px-4 py-2.5 text-right">Last activity</th><th className="px-4 py-2.5 text-right">Open tasks</th><th className="px-4 py-2.5">Flags</th></tr></thead>
            <tbody>
              {metrics.filter((m) => m.client.status !== "churned").map((m) => (
                <tr key={m.client.id} className="border-b">
                  <td className="px-4 py-2.5 font-medium">{m.client.displayName}</td>
                  <td className="px-4 py-2.5"><HealthDot status={m.health.status} label={m.health.status} /></td>
                  <td className="px-4 py-2.5 text-xs muted">{m.progress ? `${formatDateDDMMYYYY(m.progress.cycleStart)} → ${formatDateDDMMYYYY(m.progress.cycleEnd)}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.progress ? `${m.progress.postedCount} / ${m.progress.promised}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.progress?.expectedByToday ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.progress ? (m.progress.isBehind ? <Pill tone={m.progress.behindCount >= 3 ? "red" : "amber"}>Behind by {m.progress.behindCount}</Pill> : <Pill tone="green">On track</Pill>) : <Pill>One-off</Pill>}</td>
                  <td className={cn("px-4 py-2.5 text-right tabular-nums", m.inactiveDays >= 7 && "text-[#dc2626] font-medium")}>{m.inactiveDays}d ago</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.openTasks}</td>
                  <td className="px-4 py-2.5 text-xs muted">{m.health.reasons.slice(0, 2).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Stale clients (no activity > 3 days)">
          <ul className="text-sm space-y-1">{metrics.filter((m) => m.inactiveDays > 3).map((m) => <li key={m.client.id} className="flex justify-between"><span>{m.client.displayName}</span><span className="muted">{m.inactiveDays}d</span></li>)}{metrics.filter((m) => m.inactiveDays > 3).length === 0 && <li className="muted">None</li>}</ul>
        </Card>
        <Card title="Behind-schedule flags">
          <ul className="text-sm space-y-1">{metrics.filter((m) => m.progress?.isBehind).map((m) => <li key={m.client.id} className="flex justify-between"><span>{m.client.displayName}</span><span className="muted">−{m.progress!.behindCount} videos</span></li>)}{metrics.filter((m) => m.progress?.isBehind).length === 0 && <li className="muted">All on pace</li>}</ul>
        </Card>
      </div>
    </div>
  );
}

function MonthlyReport() {
  const store = useStore();
  const clients = store.state.clients.filter((c) => !c.deletedAt);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [results, setResults] = useState({ reach: "", followers: "", leads: "", nextPlan: "" });
  const client = clients.find((c) => c.id === clientId);
  const plan = store.state.plans.find((p) => p.clientId === clientId && p.active);
  const cycle = plan ? getClientCycleWindow(plan.cycleDay, store.today) : null;
  const items = useMemo(() => store.state.content.filter((c) => c.clientId === clientId && !c.deletedAt && c.stage === "posted" && cycle && (c.postedAt ?? "").slice(0, 10) >= cycle.cycleStart).sort((a, b) => (a.postedAt ?? "").localeCompare(b.postedAt ?? "")), [store.state.content, clientId, cycle]);
  if (!client) return <Card><p className="muted text-sm">No clients.</p></Card>;

  return (
    <div className="space-y-4">
      <div className="no-print grid sm:grid-cols-2 gap-3">
        <Field label="Client"><Select value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select></Field>
        <p className="text-xs muted self-end">White-label ready: print with the brand header, or hide it from the browser print dialog&apos;s header/footer settings.</p>
      </div>
      <Card className="print-page">
        <div className="flex justify-between items-start border-b pb-4 mb-4">
          <div><p className="text-xs uppercase tracking-widest muted">Orbit Media by Orbitcore</p><h2 className="text-xl font-semibold mt-1">Monthly report — {client.officialName}</h2><p className="text-sm muted">{cycle ? `${formatDateDDMMYYYY(cycle.cycleStart)} → ${formatDateDDMMYYYY(cycle.cycleEnd)}` : formatDateDDMMYYYY(store.today)}</p></div>
          <div className="text-right text-sm"><p className="font-medium">{plan?.packageName ?? "One-off"}</p><p className="muted text-xs">{items.length} delivered{plan ? ` of ${plan.videosPerCycle}` : ""}</p></div>
        </div>
        <h3 className="text-sm font-semibold mb-2">What was delivered</h3>
        <ul className="text-sm divide-y mb-5">{items.map((c) => <li key={c.id} className="py-1.5 flex justify-between gap-3"><span lang="hi">{c.title} <span className="muted text-xs">· {c.type} · {c.platforms.join(", ")}</span></span><span className="muted text-xs tabular-nums"><DateText value={c.postedAt?.slice(0, 10)} /></span></li>)}{items.length === 0 && <li className="py-2 muted">Nothing posted in this cycle yet.</li>}</ul>
        <h3 className="text-sm font-semibold mb-2">Posting calendar</h3>
        <div className="flex flex-wrap gap-1.5 mb-5">{items.map((c) => <Pill key={c.id}>{formatDateDDMMYYYY(c.postedAt?.slice(0, 10))}</Pill>)}</div>
        <h3 className="text-sm font-semibold mb-2">Results</h3>
        <div className="grid grid-cols-3 gap-3 mb-5 text-sm">
          {(["reach", "followers", "leads"] as const).map((k) => <label key={k} className="block"><span className="label capitalize">{k}</span><input className="input print:border-0 print:px-0" value={results[k]} onChange={(e) => setResults({ ...results, [k]: e.target.value })} placeholder="—" /></label>)}
        </div>
        <h3 className="text-sm font-semibold mb-2">Next month&apos;s plan</h3>
        <Textarea className="print:border-0 print:px-0" value={results.nextPlan || client.monthlyPlan || ""} onChange={(e) => setResults({ ...results, nextPlan: e.target.value })} placeholder="Themes, shoot dates, campaigns…" lang="hi" />
        <p className="text-[10px] muted mt-6">Prepared by {store.state.settings.headerText} · {formatDateDDMMYYYY(store.today)}</p>
      </Card>
      <div className="flex justify-end no-print"><Button onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</Button></div>
    </div>
  );
}

function Exports() {
  const store = useStore();
  const s = store.state;
  const cname = (id?: string) => s.clients.find((c) => c.id === id)?.officialName ?? "";
  const tname = (id?: string) => s.team.find((t) => t.id === id)?.name ?? "";
  const sets: { label: string; rows: () => Record<string, unknown>[]; needs?: "view_money" | "view_sales" }[] = [
    { label: "Clients", rows: () => s.clients.map((c) => ({ ...c, aliases: c.aliases.join("|"), wrongSpellings: c.wrongSpellings.join("|"), owner: tname(c.ownerId) })) },
    { label: "Content items", rows: () => s.content.map((c) => ({ ...c, client: cname(c.clientId), assignee: tname(c.assigneeId), stage: STAGE_LABEL[c.stage], platforms: c.platforms.join("|") })) },
    { label: "Tasks", rows: () => s.tasks.map((t) => ({ ...t, client: cname(t.clientId), assignee: tname(t.assigneeId), checklist: t.checklist.map((c) => `${c.done ? "[x]" : "[ ]"} ${c.text}`).join("|") })) },
    { label: "Requests", rows: () => s.requests.map((r) => ({ ...r, client: cname(r.clientId), loggedBy: tname(r.loggedBy) })) },
    { label: "Projects", rows: () => s.projects.map((p) => ({ ...p, client: cname(p.clientId), priceRupees: p.pricePaise / 100 })) },
    { label: "Shoots", rows: () => s.shoots.map((sh) => ({ ...sh, crew: sh.crew.map(tname).join("|"), items: sh.items.length })) },
    { label: "Leads", needs: "view_sales", rows: () => s.leads.map((l) => ({ ...l, owner: tname(l.ownerId), valueRupees: l.estimatedValuePaise / 100 })) },
    { label: "Invoices", needs: "view_money", rows: () => s.invoices.map((i) => ({ ...i, client: cname(i.clientId), items: i.items.length, subtotalRupees: i.subtotalPaise / 100, gstRupees: i.gstAmountPaise / 100, totalRupees: i.totalPaise / 100, paidRupees: invoicePaid(store, i) / 100 })) },
    { label: "Payments", needs: "view_money", rows: () => s.payments.map((p) => ({ ...p, client: cname(p.clientId), amountRupees: p.amountPaise / 100 })) },
    { label: "Activity log", rows: () => s.activity.map((a) => ({ ...a, client: cname(a.clientId), actor: tname(a.actorId) })) },
  ];
  return (
    <Card title="Download CSV" action={<span className="text-xs muted">UTF-8 with BOM · opens correctly in Excel with Hindi</span>}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sets.filter((x) => !x.needs || store.can(x.needs)).map((x) => (
          <button key={x.label} className="btn btn-ghost justify-between" onClick={() => downloadText(`orbit-ops-${x.label.toLowerCase().replace(/\s+/g, "-")}-${store.today}.csv`, toCsv(x.rows()), "text/csv")}>
            {x.label} <Download size={14} />
          </button>
        ))}
      </div>
      {store.can("export_all") && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium">Export everything (Owner)</p>
          <p className="text-xs muted mb-2">Full JSON backup of all data. A weekly scheduled export to Storage is configured via Vercel Cron (<code>/api/cron/weekly-export</code>).</p>
          <Button onClick={() => downloadText(`orbit-ops-backup-${store.today}.json`, JSON.stringify(store.state, null, 2), "application/json")}><Download size={16} /> Download full JSON backup</Button>
        </div>
      )}
    </Card>
  );
}
