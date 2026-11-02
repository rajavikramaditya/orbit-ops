"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useStore, STAGE_LABEL, STAGE_ORDER } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Button, Card, EmptyState, PageHeader, Pill, Segmented, Select, DateText, cn } from "@/components/ui";
import { ContentCard } from "@/components/ContentCard";
import { QuickAdd } from "@/components/QuickAdd";
import { ContentItem, ContentStage } from "@/lib/types";

const BOARD_STAGES: ContentStage[] = [...STAGE_ORDER, "revision_requested"];

export default function ContentPage() {
  return (
    <Suspense fallback={null}>
      <ContentPipeline />
    </Suspense>
  );
}

function ContentPipeline() {
  const store = useStore();
  const teamName = useTeamName();
  const params = useSearchParams();
  const focus = params.get("focus");
  const [view, setView] = useState<"kanban" | "table" | "calendar">("kanban");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState(store.role === "team" ? store.currentUser.id : "all");
  const [quick, setQuick] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      store.state.content
        .filter((c) => !c.deletedAt && c.stage !== "dropped")
        .filter((c) => (clientFilter === "all" ? true : c.clientId === clientFilter))
        .filter((c) => (assigneeFilter === "all" ? true : c.assigneeId === assigneeFilter))
        .filter((c) => (store.role === "team" ? c.assigneeId === store.currentUser.id || store.state.clients.find((x) => x.id === c.clientId)?.ownerId === store.currentUser.id || true : true)),
    [store, clientFilter, assigneeFilter]
  );

  const onDrop = (stage: ContentStage) => {
    if (!dragId) return;
    const item = store.state.content.find((c) => c.id === dragId);
    if (item && item.stage !== stage) store.moveContentStage(dragId, stage);
    setDragId(null);
  };

  return (
    <div>
      <PageHeader title="Content pipeline" subtitle="Idea → Planned for shoot → Shot → In editing → Ready for approval → Approved → Scheduled → Posted" actions={<>
        <Segmented value={view} onChange={setView} options={[{ id: "kanban", label: "Board" }, { id: "table", label: "Table" }, { id: "calendar", label: "Calendar" }]} />
        {store.can("manage_content") && <Button onClick={() => setQuick(true)}><Plus size={16} /> Content</Button>}
      </>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select className="!w-auto" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}><option value="all">All clients</option>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select>
        <Select className="!w-auto" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}><option value="all">Everyone</option>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        <span className="self-center text-xs muted">{items.length} items</span>
      </div>

      {view === "kanban" && (
        <div className="scroll-x -mx-3 px-3 pb-3">
          <div className="flex gap-3 min-w-max">
            {BOARD_STAGES.map((stage) => {
              const col = items.filter((c) => c.stage === stage);
              return (
                <div key={stage} className={cn("kanban-col rounded-2xl soft p-2.5 flex flex-col", dragId && "outline-dashed outline-1 outline-[var(--line)]")} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(stage)}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", stage === "revision_requested" && "text-[#d97706]")}>{STAGE_LABEL[stage]}</p>
                    <span className="text-xs muted tabular-nums">{col.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {col.map((c) => (
                      <div key={c.id} draggable={store.can("manage_content")} onDragStart={() => setDragId(c.id)} onDragEnd={() => setDragId(null)} className={cn(dragId === c.id && "opacity-50")}>
                        <ContentCard item={c} showClient highlight={focus === c.id} />
                      </div>
                    ))}
                    {col.length === 0 && <p className="text-[11px] muted text-center py-6">Empty</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] muted mt-2">Desktop: drag cards between columns. Mobile: use the → button on each card.</p>
        </div>
      )}

      {view === "table" && <TableView items={items} teamName={teamName} />}
      {view === "calendar" && <CalendarView items={items} />}

      <QuickAdd open={quick} onClose={() => setQuick(false)} defaultKind="content" />
    </div>
  );
}

function TableView({ items, teamName }: { items: ContentItem[]; teamName: (id?: string) => string }) {
  const store = useStore();
  const [sel, setSel] = useState<ContentItem | null>(null);
  const sorted = [...items].sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
  return (
    <Card padded={false}>
      <div className="scroll-x">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="text-xs uppercase tracking-wide muted text-left">
            <tr className="border-b"><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Stage</th><th className="px-4 py-2.5">Assignee</th><th className="px-4 py-2.5">Shoot</th><th className="px-4 py-2.5">Due</th><th className="px-4 py-2.5">Post</th><th className="px-4 py-2.5">Rev</th></tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b row-hover cursor-pointer" onClick={() => setSel(c)}>
                <td className="px-4 py-2.5 font-medium">{store.state.clients.find((x) => x.id === c.clientId)?.displayName}</td>
                <td className="px-4 py-2.5" lang="hi">{c.title}</td>
                <td className="px-4 py-2.5 muted">{c.type}</td>
                <td className="px-4 py-2.5"><Pill tone={c.stage === "revision_requested" ? "amber" : c.stage === "posted" ? "green" : "neutral"}>{STAGE_LABEL[c.stage]}</Pill></td>
                <td className="px-4 py-2.5">{teamName(c.assigneeId)}</td>
                <td className="px-4 py-2.5"><DateText value={c.plannedShootOn} /></td>
                <td className={cn("px-4 py-2.5", c.dueOn && c.dueOn < store.today && c.stage !== "posted" && "text-[#dc2626] font-medium")}><DateText value={c.dueOn} /></td>
                <td className="px-4 py-2.5"><DateText value={c.postOn} /></td>
                <td className="px-4 py-2.5 tabular-nums">{c.revisionCount}</td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan={9}><EmptyState title="No content" /></td></tr>}
          </tbody>
        </table>
      </div>
      {sel && <div className="p-4 border-t"><ContentCard item={sel} showClient /></div>}
    </Card>
  );
}

function CalendarView({ items }: { items: ContentItem[] }) {
  const store = useStore();
  const [month, setMonth] = useState(() => store.today.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const shift = (d: number) => { const nd = new Date(Date.UTC(y, m - 1 + d, 1)); setMonth(nd.toISOString().slice(0, 7)); };
  const byDay = (day: string) => items.filter((c) => (c.postOn ?? c.dueOn) === day);
  const shootsByDay = (day: string) => store.state.shoots.filter((s) => s.shootDate === day && !s.deletedAt && s.status !== "cancelled");

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" variant="ghost" onClick={() => shift(-1)}>‹ Prev</Button>
        <p className="font-semibold">{first.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
        <Button size="sm" variant="ghost" onClick={() => shift(1)}>Next ›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide muted mb-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[84px] rounded-lg border p-1 text-xs", !day && "opacity-0", day === store.today && "border-[var(--fg)]")}>
            {day && (
              <>
                <p className={cn("font-medium tabular-nums", day === store.today && "underline")}>{Number(day.slice(-2))}</p>
                {shootsByDay(day).map((s) => <p key={s.id} className="mt-0.5 rounded px-1 py-0.5 truncate font-medium" style={{ background: "var(--fg)", color: "var(--bg)" }} title={s.location}>Shoot</p>)}
                {byDay(day).slice(0, 3).map((c) => (
                  <p key={c.id} className={cn("mt-0.5 rounded px-1 py-0.5 truncate soft border", c.stage === "posted" && "pill-green", c.stage === "revision_requested" && "pill-amber")} title={`${store.state.clients.find((x) => x.id === c.clientId)?.displayName}: ${c.title}`} lang="hi">{c.title}</p>
                ))}
                {byDay(day).length > 3 && <p className="muted mt-0.5">+{byDay(day).length - 3} more</p>}
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] muted mt-3">Shows posting date (or due date if unset). Posting calendar per client: use the client filter above.</p>
    </Card>
  );
}
