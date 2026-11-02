"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, Check, Snowflake, Camera, Hourglass, UsersRound } from "lucide-react";
import { useStore, STAGE_LABEL } from "@/lib/store";
import { useMetrics, useTeamName } from "@/lib/hooks";
import { Avatar, Card, EmptyState, HealthDot, PageHeader, Pill, PriorityTag, Segmented, DateText, cn } from "@/components/ui";
import { daysBetweenDates, formatDateDDMMYYYY } from "@/lib/business-rules";
import { PriorityRow } from "@/lib/selectors";
import { ContentStage } from "@/lib/types";

export default function TodayPage() {
  const store = useStore();
  const { metrics, priorities } = useMetrics();
  const teamName = useTeamName();
  const [scope, setScope] = useState<"mine" | "everyone">(store.role === "team" ? "mine" : "everyone");

  const visible = useMemo(() => {
    let rows = priorities;
    if (!store.can("view_sales")) rows = rows.filter((r) => r.kind !== "lead");
    if (!store.can("triage_requests")) rows = rows.filter((r) => r.kind !== "request");
    if (scope === "mine") rows = rows.filter((r) => r.assigneeId === store.currentUser.id);
    return rows;
  }, [priorities, scope, store]);

  const overdue = visible.filter((r) => r.overdueDays > 0);
  const todayList = visible.filter((r) => r.overdueDays === 0).slice(0, 12);

  const cold = metrics
    .filter((m) => m.inactiveDays > store.state.settings.healthThresholds.greenMaxInactiveDays && m.client.status !== "churned")
    .sort((a, b) => b.inactiveDays - a.inactiveDays);

  const waitingApproval = store.state.content
    .filter((c) => !c.deletedAt && c.stage === "ready_for_approval" && daysBetweenDates(c.stageChangedAt.slice(0, 10), store.today) > store.state.settings.healthThresholds.approvalWaitDays)
    .map((c) => ({ ...c, days: daysBetweenDates(c.stageChangedAt.slice(0, 10), store.today) }));

  const todayShoot = store.state.shoots.find((s) => s.shootDate === store.today && s.status !== "cancelled" && !s.deletedAt);

  const whoIsDoing = store.state.team
    .filter((t) => t.active)
    .map((t) => {
      const top = priorities.filter((r) => r.assigneeId === t.id && r.kind !== "lead").slice(0, 2);
      return { t, top, count: priorities.filter((r) => r.assigneeId === t.id).length };
    });

  const cname = (id?: string) => store.state.clients.find((c) => c.id === id)?.displayName;

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={
          <>
            {formatDateDDMMYYYY(store.today)} · Namaste {store.currentUser.name.split(" ")[0]} — what must we do today, and which client is falling behind?
          </>
        }
        actions={<Segmented value={scope} onChange={setScope} options={[{ id: "mine", label: "Mine" }, { id: "everyone", label: "Everyone" }]} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card title={<span className="flex items-center gap-2"><AlarmClock size={16} /> Priority list</span>} action={<span className="text-xs muted">Sorted by priority score</span>} padded={false}>
            {todayList.length === 0 && overdue.length === 0 ? (
              <EmptyState title="Nothing urgent right now" hint="Add a request or task with Quick add, or check the Content board." />
            ) : (
              <ul className="divide-y">
                {todayList.map((r) => (
                  <PriorityRowView key={r.kind + r.id} row={r} />
                ))}
              </ul>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2 text-[#dc2626]"><AlarmClock size={16} /> Overdue ({overdue.length})</span>} padded={false}>
            {overdue.length === 0 ? <EmptyState title="Nothing overdue" hint="Great — keep the loop tight." /> : (
              <ul className="divide-y">
                {overdue.map((r) => (
                  <PriorityRowView key={r.kind + r.id} row={r} overdue />
                ))}
              </ul>
            )}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title={<span className="flex items-center gap-2"><Snowflake size={16} /> Clients going cold</span>} padded={false}>
              {cold.length === 0 ? <EmptyState title="All clients active" /> : (
                <ul className="divide-y">
                  {cold.map((m) => (
                    <li key={m.client.id} className="px-4 py-3 flex items-center justify-between gap-3 row-hover">
                      <div className="min-w-0">
                        <Link href={`/clients/${m.client.id}`} className="font-medium text-sm hover:underline">{m.client.displayName}</Link>
                        <p className="text-xs muted">{m.health.reasons[0]}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <HealthDot status={m.health.status} />
                        <p className={cn("text-xs font-semibold tabular-nums", m.health.status === "red" ? "text-[#dc2626]" : "text-[#d97706]")}>{m.inactiveDays}d silent</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={<span className="flex items-center gap-2"><Hourglass size={16} /> Waiting on client approval &gt; 2 days</span>} padded={false}>
              {waitingApproval.length === 0 ? <EmptyState title="No approvals stuck" /> : (
                <ul className="divide-y">
                  {waitingApproval.map((c) => (
                    <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 row-hover">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.title}</p>
                        <p className="text-xs muted">{cname(c.clientId)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Pill tone="amber">{c.days}d waiting</Pill>
                        {store.can("manage_content") && (
                          <button className="btn btn-ghost btn-sm" onClick={() => store.moveContentStage(c.id, "approved")}>Approve</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><Camera size={16} /> Today&apos;s shoot</span>}>
            {!todayShoot ? (
              <p className="muted text-sm">No shoot planned today. <Link href="/shoots" className="underline">Plan one →</Link></p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">{todayShoot.startTime} · {todayShoot.location}</p>
                  <p className="muted text-xs">{todayShoot.equipmentNotes}</p>
                </div>
                <div className="flex -space-x-1.5">
                  {todayShoot.crew.map((id) => <Avatar key={id} name={teamName(id)} />)}
                  <span className="ml-3 text-xs muted self-center pl-2">{todayShoot.crew.map(teamName).join(", ")}</span>
                </div>
                <ul className="space-y-1.5">
                  {Array.from(new Set(todayShoot.items.map((i) => i.clientId))).map((cid) => (
                    <li key={cid} className="rounded-lg soft px-3 py-2">
                      <p className="font-medium text-xs">{cname(cid)}</p>
                      <p className="text-xs muted">{todayShoot.items.filter((i) => i.clientId === cid).length} items · {todayShoot.items.filter((i) => i.clientId === cid).map((i) => i.shotList.split(",")[0]).join(" · ")}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/shoots" className="btn btn-ghost btn-sm w-full">Open shoot planner</Link>
              </div>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><UsersRound size={16} /> Who is doing what</span>} padded={false}>
            <ul className="divide-y">
              {whoIsDoing.map(({ t, top, count }) => (
                <li key={t.id} className="px-4 py-2.5 flex items-start gap-3">
                  <Avatar name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.name} <span className="muted font-normal text-xs">· {count} open</span></p>
                    <p className="text-xs muted truncate">{top.length ? top.map((r) => r.title).join(" · ") : "Free — can take new work"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {store.can("view_sales") && (
            <Card title="Sales follow-ups due">
              {priorities.filter((r) => r.kind === "lead").length === 0 ? <p className="muted text-sm">None due today.</p> : (
                <ul className="space-y-2">
                  {priorities.filter((r) => r.kind === "lead").map((r) => (
                    <li key={r.id} className="text-sm flex justify-between gap-2">
                      <Link href="/sales" className="hover:underline truncate">{r.title.replace("Follow up: ", "")}</Link>
                      <span className="muted text-xs shrink-0">{r.overdueDays > 0 ? `${r.overdueDays}d late` : "today"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityRowView({ row, overdue }: { row: PriorityRow; overdue?: boolean }) {
  const store = useStore();
  const teamName = useTeamName();
  const [busy, setBusy] = useState(false);

  const done = () => {
    setBusy(true);
    try {
      if (row.kind === "task") store.completeTask(row.id);
      else if (row.kind === "content") {
        const next: Partial<Record<string, ContentStage>> = { idea: "planned_for_shoot", planned_for_shoot: "shot", shot: "in_editing", in_editing: "ready_for_approval", ready_for_approval: "approved", approved: "scheduled", scheduled: "posted", revision_requested: "in_editing" };
        store.moveContentStage(row.id, next[row.stageLabel ?? "idea"] ?? "posted");
      } else if (row.kind === "request") store.updateRequest(row.id, { triageStatus: "triaged" });
      else if (row.kind === "project") store.updateProject(row.id, { status: "delivered" });
      else if (row.kind === "lead") {
        const d = new Date(store.today);
        d.setDate(d.getDate() + 3);
        store.updateLead(row.id, { nextFollowUpOn: d.toISOString().slice(0, 10) });
      }
    } finally {
      setBusy(false);
    }
  };
  const snooze = () => {
    if (row.kind === "task") store.snoozeTask(row.id);
    else if (row.kind === "content") {
      const d = new Date(store.today);
      d.setDate(d.getDate() + 1);
      store.updateContent(row.id, { dueOn: d.toISOString().slice(0, 10) });
    } else if (row.kind === "lead") {
      const d = new Date(store.today);
      d.setDate(d.getDate() + 1);
      store.updateLead(row.id, { nextFollowUpOn: d.toISOString().slice(0, 10) });
    } else if (row.kind === "project") {
      const d = new Date(row.dueOn ?? store.today);
      d.setDate(d.getDate() + 1);
      store.updateProject(row.id, { dueOn: d.toISOString().slice(0, 10) });
    }
  };

  const href = row.kind === "task" ? `/tasks?focus=${row.id}` : row.kind === "content" ? `/content?focus=${row.id}` : row.kind === "request" ? "/requests" : row.kind === "project" ? "/projects" : "/sales";

  return (
    <li className="px-4 py-3 flex items-center gap-3 row-hover">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {row.clientId ? <Link href={`/clients/${row.clientId}`} className="text-xs font-semibold uppercase tracking-wide hover:underline">{row.clientName}</Link> : <span className="text-xs font-semibold uppercase tracking-wide muted">{row.clientName}</span>}
          {row.stageLabel && <Pill>{STAGE_LABEL[row.stageLabel as ContentStage] ?? row.stageLabel.replace(/_/g, " ")}</Pill>}
        </div>
        <Link href={href} className="block text-sm font-medium mt-0.5 hover:underline">{row.title}</Link>
        <p className="text-[11px] muted mt-0.5">
          {teamName(row.assigneeId)} · due <DateText value={row.dueOn} /> · {row.reason} · score {row.score}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <PriorityTag p={row.priority} />
        {overdue && <Pill tone="red">{row.overdueDays}d late</Pill>}
        <button onClick={done} disabled={busy} className="btn btn-ghost btn-sm" aria-label="Done" title={row.kind === "content" ? "Move to next stage" : "Mark done"}>
          <Check size={14} />
        </button>
        {row.kind !== "request" && (
          <button onClick={snooze} className="btn btn-ghost btn-sm hidden sm:inline-flex" title="Snooze to tomorrow">
            <AlarmClock size={14} />
          </button>
        )}
      </div>
    </li>
  );
}
