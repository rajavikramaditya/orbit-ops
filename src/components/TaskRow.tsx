"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, AlarmClock, Trash2 } from "lucide-react";
import { useStore, TASK_STATUS_LABEL } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, DateText, Field, Input, Pill, PriorityTag, Select, Textarea, cn } from "@/components/ui";
import { TaskItem } from "@/lib/types";
import { daysBetweenDates } from "@/lib/business-rules";
import { Comments } from "@/components/Comments";

export function TaskRow({ task, showClient = true, highlight }: { task: TaskItem; showClient?: boolean; highlight?: boolean }) {
  const store = useStore();
  const teamName = useTeamName();
  const [open, setOpen] = useState(Boolean(highlight));
  const client = store.state.clients.find((c) => c.id === task.clientId);
  const overdue = task.status !== "done" ? daysBetweenDates(task.dueOn, store.today) : 0;
  const canEdit = store.can("manage_tasks") && (store.role !== "team" || task.assigneeId === store.currentUser.id);
  const [newItem, setNewItem] = useState("");

  const toggleCheck = (id: string) => store.updateTask(task.id, { checklist: task.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
  const addCheck = () => {
    if (!newItem.trim()) return;
    store.updateTask(task.id, { checklist: [...task.checklist, { id: Math.random().toString(36).slice(2), text: newItem.trim(), done: false }] });
    setNewItem("");
  };

  return (
    <li className={cn("px-4 py-3", highlight && "ring-2 ring-[var(--fg)] rounded-xl", task.status === "done" && "opacity-60")}>
      <div className="flex items-start gap-3">
        {canEdit && task.status !== "done" && (
          <button onClick={() => store.completeTask(task.id)} className="mt-0.5 h-6 w-6 rounded-md border flex items-center justify-center hover:soft shrink-0" aria-label="Mark done">
            <Check size={14} className="opacity-0 hover:opacity-100" />
          </button>
        )}
        {task.status === "done" && <span className="mt-0.5 h-6 w-6 rounded-md border flex items-center justify-center shrink-0" style={{ background: "var(--fg)", color: "var(--bg)" }}><Check size={14} /></span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {showClient && (client ? <Link href={`/clients/${client.id}`} className="text-[11px] uppercase tracking-wide font-semibold hover:underline">{client.displayName}</Link> : <span className="text-[11px] uppercase tracking-wide font-semibold muted">Internal</span>)}
            {task.recurrence && <Pill>{task.recurrence}</Pill>}
            {task.contentItemId && <Pill>content</Pill>}
          </div>
          <button onClick={() => setOpen(!open)} className={cn("text-left text-sm font-medium mt-0.5", task.status === "done" && "line-through")} lang="hi">{task.title}</button>
          <p className="text-[11px] muted mt-0.5 flex flex-wrap items-center gap-x-2">
            <span className="inline-flex items-center gap-1"><Avatar name={teamName(task.assigneeId)} /> {teamName(task.assigneeId)}</span>
            <span>due <DateText value={task.dueOn} /></span>
            <span>· {TASK_STATUS_LABEL[task.status]}</span>
            {task.checklist.length > 0 && <span>· {task.checklist.filter((c) => c.done).length}/{task.checklist.length} checklist</span>}
            <span>· {task.estimatedHours}h</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityTag p={task.priority} />
          {overdue > 0 && <Pill tone="red">{overdue}d late</Pill>}
          {canEdit && task.status !== "done" && (
            <button onClick={() => store.snoozeTask(task.id)} className="btn btn-ghost btn-sm hidden sm:inline-flex" title="Snooze to tomorrow"><AlarmClock size={13} /></button>
          )}
          <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm" aria-label="Expand">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        </div>
      </div>

      {open && (
        <div className="mt-3 ml-9 grid gap-4 lg:grid-cols-2 fade-in">
          <div className="space-y-3">
            {task.description && <p className="text-sm whitespace-pre-wrap" lang="hi">{task.description}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Status">
                <Select value={task.status} disabled={!canEdit} onChange={(e) => store.updateTask(task.id, { status: e.target.value as TaskItem["status"], completedAt: e.target.value === "done" ? new Date().toISOString() : undefined })}>
                  {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Assignee">
                <Select value={task.assigneeId} disabled={!store.can("triage_requests")} onChange={(e) => store.updateTask(task.id, { assigneeId: e.target.value })}>
                  {store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={task.priority} disabled={!canEdit} onChange={(e) => store.updateTask(task.id, { priority: e.target.value as TaskItem["priority"] })}>
                  <option value="P1">P1 urgent</option><option value="P2">P2 normal</option><option value="P3">P3 low</option>
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={task.dueOn} disabled={!canEdit} onChange={(e) => store.updateTask(task.id, { dueOn: e.target.value })} />
              </Field>
              <Field label="Recurring">
                <Select value={task.recurrence ?? ""} disabled={!canEdit} onChange={(e) => store.updateTask(task.id, { recurrence: (e.target.value || null) as TaskItem["recurrence"] })}>
                  <option value="">No</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                </Select>
              </Field>
              <Field label="Est. hours">
                <Input type="number" step="0.5" value={task.estimatedHours} disabled={!canEdit} onChange={(e) => store.updateTask(task.id, { estimatedHours: Number(e.target.value) })} />
              </Field>
            </div>
            <div>
              <p className="label">Checklist</p>
              <ul className="space-y-1">
                {task.checklist.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)} disabled={!canEdit} className="h-4 w-4" />
                      <span className={c.done ? "line-through muted" : ""} lang="hi">{c.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item" className="!min-h-[36px] text-xs" onKeyDown={(e) => e.key === "Enter" && addCheck()} lang="hi" />
                  <Button size="sm" variant="ghost" onClick={addCheck}>Add</Button>
                </div>
              )}
            </div>
            {store.can("manage_clients") && (
              <button className="text-xs muted inline-flex items-center gap-1 hover:text-[#dc2626]" onClick={() => store.softDelete("tasks", task.id)}><Trash2 size={13} /> Move to trash</button>
            )}
          </div>
          <Comments entityType="task" entityId={task.id} clientId={task.clientId} />
        </div>
      )}
    </li>
  );
}

export { Textarea };
