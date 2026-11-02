"use client";

import { useStore, STAGE_LABEL } from "@/lib/store";
import { useMetrics } from "@/lib/hooks";
import { Avatar, Card, PageHeader, Pill, cn } from "@/components/ui";
import { Forbidden } from "@/components/Forbidden";
import { ROLE_LABEL } from "@/lib/rbac";

export default function TeamPage() {
  const store = useStore();
  const { priorities } = useMetrics();
  if (!store.can("view_team")) return <Forbidden what="Team workload" />;

  const weekEnd = (() => { const d = new Date(store.today); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const capacityHours = 36; // 6 working days × 6 focused hours

  const rows = store.state.team.filter((t) => t.active).map((t) => {
    const tasks = store.state.tasks.filter((x) => !x.deletedAt && x.status !== "done" && x.assigneeId === t.id);
    const content = store.state.content.filter((x) => !x.deletedAt && !["posted", "dropped"].includes(x.stage) && x.assigneeId === t.id);
    const dueThisWeek = [...tasks.filter((x) => x.dueOn <= weekEnd), ...content.filter((x) => x.dueOn && x.dueOn <= weekEnd)].length;
    const overdue = [...tasks.filter((x) => x.dueOn < store.today), ...content.filter((x) => x.dueOn && x.dueOn < store.today)].length;
    const hours = tasks.reduce((a, x) => a + x.estimatedHours, 0) + content.length * 2.5;
    return { t, tasks, content, dueThisWeek, overdue, hours, top: priorities.filter((p) => p.assigneeId === t.id).slice(0, 3) };
  });

  const unassigned = store.state.content.filter((x) => !x.deletedAt && !x.assigneeId).length + store.state.tasks.filter((x) => !x.deletedAt && !x.assigneeId).length;

  return (
    <div>
      <PageHeader title="Team & workload" subtitle={`Open work per person · estimated hours vs ~${capacityHours}h weekly capacity · ${unassigned} unassigned items`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ t, tasks, content, dueThisWeek, overdue, hours, top }) => (
          <Card key={t.id}>
            <div className="flex items-center gap-3">
              <Avatar name={t.name} size="md" />
              <div className="min-w-0"><p className="font-semibold">{t.name} <span className="muted text-xs font-normal">· {ROLE_LABEL[t.role]}</span></p><p className="text-xs muted truncate">{t.specialty}</p></div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1"><span className="muted">Estimated load</span><span className={cn("font-semibold tabular-nums", hours > capacityHours && "text-[#dc2626]")}>{hours.toFixed(1)}h / {capacityHours}h</span></div>
              <div className="h-2 rounded-full soft overflow-hidden"><div className={cn("h-full", hours > capacityHours ? "bg-[#dc2626]" : hours > capacityHours * 0.8 ? "bg-[#d97706]" : "bg-[var(--fg)]")} style={{ width: `${Math.min(100, (hours / capacityHours) * 100)}%` }} /></div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div><p className="text-lg font-semibold tabular-nums">{tasks.length}</p><p className="text-[10px] muted uppercase">tasks</p></div>
              <div><p className="text-lg font-semibold tabular-nums">{content.length}</p><p className="text-[10px] muted uppercase">content</p></div>
              <div><p className="text-lg font-semibold tabular-nums">{dueThisWeek}</p><p className="text-[10px] muted uppercase">this week</p></div>
              <div><p className={cn("text-lg font-semibold tabular-nums", overdue > 0 && "text-[#dc2626]")}>{overdue}</p><p className="text-[10px] muted uppercase">overdue</p></div>
            </div>
            <div className="mt-4 border-t pt-3">
              <p className="label">Top priorities</p>
              {top.length === 0 ? <p className="text-xs muted">Free — can take new work</p> : <ul className="space-y-1.5">{top.map((p) => <li key={p.kind + p.id} className="text-xs flex items-start gap-1.5"><Pill>{p.stageLabel ? STAGE_LABEL[p.stageLabel as keyof typeof STAGE_LABEL] ?? p.stageLabel : p.kind}</Pill><span className="truncate">{p.title}</span></li>)}</ul>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
