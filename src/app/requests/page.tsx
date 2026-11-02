"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard, CheckSquare, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Button, Card, EmptyState, Input, PageHeader, Pill, PriorityTag, Segmented, Select, cn } from "@/components/ui";
import { formatDateTimeIST, isRequestOverdueForTriage } from "@/lib/business-rules";
import { QuickAdd } from "@/components/QuickAdd";
import { ClientRequest, TaskPriority, TriageStatus } from "@/lib/types";

export default function RequestsPage() {
  const store = useStore();
  const teamName = useTeamName();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [quick, setQuick] = useState(false);
  const canTriage = store.can("triage_requests");

  const list = store.state.requests
    .filter((r) => !r.deletedAt)
    .filter((r) => (filter === "open" ? r.triageStatus !== "done" : true))
    .sort((a, b) => {
      const rank: Record<TriageStatus, number> = { new: 0, triaged: 1, in_progress: 2, done: 3 };
      return rank[a.triageStatus] - rank[b.triageStatus] || b.receivedAt.localeCompare(a.receivedAt);
    });

  const newCount = list.filter((r) => r.triageStatus === "new").length;

  return (
    <div>
      <PageHeader title="Requests inbox" subtitle={`Every call, WhatsApp or meeting ask lands here first. ${newCount} new · anything untriaged over ${store.state.settings.healthThresholds.requestSlaHours} working hours is flagged.`} actions={<><Segmented value={filter} onChange={setFilter} options={[{ id: "open", label: "Open" }, { id: "all", label: "All" }]} /><Button onClick={() => setQuick(true)}><Plus size={16} /> Log request</Button></>} />
      {list.length === 0 ? <Card><EmptyState title="Inbox zero" hint="Log a call or WhatsApp request in under 15 seconds with Quick add." action={<Button onClick={() => setQuick(true)}>Log request</Button>} /></Card> : (
        <div className="space-y-3">
          {list.map((r) => <RequestCard key={r.id} r={r} canTriage={canTriage} teamName={teamName} />)}
        </div>
      )}
      <QuickAdd open={quick} onClose={() => setQuick(false)} defaultKind="request" />
    </div>
  );
}

function RequestCard({ r, canTriage, teamName }: { r: ClientRequest; canTriage: boolean; teamName: (id?: string) => string }) {
  const store = useStore();
  const client = store.state.clients.find((c) => c.id === r.clientId);
  const sla = isRequestOverdueForTriage(r.receivedAt, r.triageStatus, new Date().toISOString(), store.state.settings.healthThresholds.requestSlaHours);
  const [assignee, setAssignee] = useState(r.assigneeId ?? "u-tanvi");
  const [due, setDue] = useState(r.dueOn ?? store.today);
  const [priority, setPriority] = useState<TaskPriority>(r.priority);

  const triage = (extra?: Partial<ClientRequest>) => store.updateRequest(r.id, { assigneeId: assignee, dueOn: due, priority, triageStatus: r.triageStatus === "new" ? "triaged" : r.triageStatus, ...extra });

  return (
    <Card className={cn(sla.isFlagged && "border-[#dc2626]")}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-xs muted">
            <Link href={`/clients/${r.clientId}`} className="font-semibold uppercase tracking-wide text-[var(--fg)] hover:underline">{client?.displayName}</Link>
            <Pill>{r.channel}</Pill>
            <span>{formatDateTimeIST(r.receivedAt)}</span>
            <span>· logged by {teamName(r.loggedBy)}</span>
            <Pill tone={r.triageStatus === "new" ? (sla.isFlagged ? "red" : "amber") : r.triageStatus === "done" ? "green" : "neutral"}>{r.triageStatus.replace("_", " ")}</Pill>
            {sla.isFlagged && <Pill tone="red">untriaged {sla.hoursElapsed}h</Pill>}
            {r.convertedToType && <Pill tone="green">→ {r.convertedToType.replace("_", " ")}</Pill>}
          </div>
          <p className="mt-2 text-sm leading-relaxed" lang="hi">{r.body}</p>
          {r.triageStatus !== "new" && <p className="text-xs muted mt-1">Assigned {teamName(r.assigneeId)} · due {r.dueOn?.split("-").reverse().join("/")} · <PriorityTag p={r.priority} /></p>}
        </div>
        {canTriage && r.triageStatus !== "done" && (
          <div className="md:w-[380px] grid grid-cols-3 gap-2 text-xs">
            <Select className="!min-h-[38px]" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option></Select>
            <Select className="!min-h-[38px]" value={assignee} onChange={(e) => setAssignee(e.target.value)}>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
            <Input className="!min-h-[38px]" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            {!r.convertedToType ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => triage()}>Triage</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { triage(); store.convertRequest(r.id, "task"); }} title="Convert to task"><CheckSquare size={13} /> Task</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { triage(); store.convertRequest(r.id, "content_item"); }} title="Convert to content item"><Clapperboard size={13} /> Content</button>
              </>
            ) : (
              <button className="btn btn-primary btn-sm col-span-3" onClick={() => store.updateRequest(r.id, { triageStatus: "done" })}>Mark done <ArrowRight size={13} /></button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
