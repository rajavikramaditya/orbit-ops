"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useStore, PROJECT_STATUS_LABEL, PROJECT_STATUS_ORDER } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, Card, DateText, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea, cn } from "@/components/ui";
import { formatPaiseToINR } from "@/lib/business-rules";
import { OneOffProject } from "@/lib/types";
import { Comments } from "@/components/Comments";

export default function ProjectsPage() {
  const store = useStore();
  const teamName = useTeamName();
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<OneOffProject | null>(null);
  const projects = store.state.projects.filter((p) => !p.deletedAt);

  return (
    <div>
      <PageHeader title="One-off projects" subtitle="Logos, brand identity, stationery, poster sets, websites — billed separately from retainers." actions={store.can("manage_projects") && <Button onClick={() => setAdding(true)}><Plus size={16} /> Project</Button>} />
      <div className="scroll-x -mx-3 px-3 pb-3">
        <div className="flex gap-3 min-w-max">
          {PROJECT_STATUS_ORDER.map((st) => {
            const col = projects.filter((p) => p.status === st);
            return (
              <div key={st} className="kanban-col rounded-2xl soft p-2.5">
                <div className="flex items-center justify-between px-1 mb-2"><p className="text-xs font-semibold uppercase tracking-wide">{PROJECT_STATUS_LABEL[st]}</p><span className="text-xs muted">{col.length}</span></div>
                <div className="space-y-2 min-h-[80px]">
                  {col.map((p) => {
                    const done = p.deliverablesChecklist.filter((d) => d.done).length;
                    const overdue = p.dueOn < store.today && !["delivered", "paid"].includes(p.status);
                    return (
                      <button key={p.id} onClick={() => setSel(p)} className="card p-3 text-left w-full text-sm">
                        <p className="text-[11px] uppercase tracking-wide font-semibold muted">{store.state.clients.find((c) => c.id === p.clientId)?.displayName}</p>
                        <p className="font-medium mt-0.5" lang="hi">{p.name}</p>
                        <div className="flex items-center justify-between mt-2 text-[11px] muted">
                          <span className="flex items-center gap-1"><Avatar name={teamName(p.assigneeId)} /> {done}/{p.deliverablesChecklist.length}</span>
                          <span className={cn(overdue && "text-[#dc2626] font-medium")}>due <DateText value={p.dueOn} /></span>
                        </div>
                        {store.can("view_money") && <p className="text-xs mt-1 font-medium tabular-nums">{formatPaiseToINR(p.pricePaise)}</p>}
                      </button>
                    );
                  })}
                  {col.length === 0 && <p className="text-[11px] muted text-center py-6">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {projects.length === 0 && <Card><EmptyState title="No projects" /></Card>}
      <NewProjectModal open={adding} onClose={() => setAdding(false)} />
      {sel && <ProjectDetail project={store.state.projects.find((p) => p.id === sel.id) ?? sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function ProjectDetail({ project: p, onClose }: { project: OneOffProject; onClose: () => void }) {
  const store = useStore();
  const canEdit = store.can("manage_projects") || p.assigneeId === store.currentUser.id;
  const [newDel, setNewDel] = useState("");
  const paid = store.state.payments.filter((x) => x.projectId === p.id && !x.deletedAt).reduce((a, x) => a + x.amountPaise, 0);
  return (
    <Modal open onClose={onClose} title={p.name} wide>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/clients/${p.clientId}`} className="text-xs font-semibold uppercase tracking-wide underline">{store.state.clients.find((c) => c.id === p.clientId)?.displayName}</Link>
            <Select className="!min-h-[36px] !w-auto text-xs" value={p.status} disabled={!canEdit} onChange={(e) => store.updateProject(p.id, { status: e.target.value as OneOffProject["status"] })}>{PROJECT_STATUS_ORDER.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}</Select>
            <Pill>rev {p.revisionCount}</Pill>
            {canEdit && <button className="text-xs underline" onClick={() => store.updateProject(p.id, { revisionCount: p.revisionCount + 1, status: "revisions" })}>+ revision</button>}
          </div>
          <p className="text-sm" lang="hi">{p.scope}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Due"><Input type="date" value={p.dueOn} disabled={!canEdit} onChange={(e) => store.updateProject(p.id, { dueOn: e.target.value })} /></Field>
            <Field label="Assignee"><Select value={p.assigneeId} disabled={!store.can("manage_projects")} onChange={(e) => store.updateProject(p.id, { assigneeId: e.target.value })}>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          </div>
          {store.can("view_money") && <p className="text-sm">Price <strong className="tabular-nums">{formatPaiseToINR(p.pricePaise)}</strong> · received <span className="tabular-nums">{formatPaiseToINR(paid)}</span> · balance <strong className="tabular-nums">{formatPaiseToINR(Math.max(0, p.pricePaise - paid))}</strong></p>}
          <div>
            <p className="label">Deliverables</p>
            <ul className="space-y-1">
              {p.deliverablesChecklist.map((d) => (
                <li key={d.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={d.done} disabled={!canEdit} onChange={() => store.updateProject(p.id, { deliverablesChecklist: p.deliverablesChecklist.map((x) => (x.id === d.id ? { ...x, done: !x.done } : x)) })} /><span className={d.done ? "line-through muted" : ""}>{d.text}</span></label></li>
              ))}
            </ul>
            {canEdit && <div className="flex gap-2 mt-2"><Input className="!min-h-[36px] text-xs" value={newDel} onChange={(e) => setNewDel(e.target.value)} placeholder="Add deliverable" /><Button size="sm" variant="ghost" disabled={!newDel} onClick={() => { store.updateProject(p.id, { deliverablesChecklist: [...p.deliverablesChecklist, { id: Math.random().toString(36).slice(2), text: newDel, done: false }] }); setNewDel(""); }}>Add</Button></div>}
          </div>
          <div>
            <p className="label">Files</p>
            <ul className="text-xs space-y-1">{p.files.map((f) => <li key={f}><a className="underline" href={f} target="_blank" rel="noreferrer">{f}</a></li>)}{p.files.length === 0 && <li className="muted">None</li>}</ul>
          </div>
          {store.can("manage_clients") && <button className="text-xs muted underline" onClick={() => { store.softDelete("projects", p.id); onClose(); }}>Move to trash</button>}
        </div>
        <Comments entityType="project" entityId={p.id} clientId={p.clientId} />
      </div>
    </Modal>
  );
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [form, setForm] = useState({ clientId: store.state.clients[0]?.id ?? "", name: "", scope: "", price: "", dueOn: store.today, assigneeId: "u-prathmes", deliverables: "Logo concepts, Final files, Brand PDF" });
  return (
    <Modal open={open} onClose={onClose} title="New one-off project">
      <div className="space-y-3">
        <Field label="Client"><Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select></Field>
        <Field label="Project name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Brand identity + stationery kit" lang="hi" /></Field>
        <Field label="Scope"><Textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} lang="hi" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Due"><Input type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} /></Field>
        </div>
        <Field label="Assignee"><Select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Deliverables (comma separated)"><Input value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!form.name} onClick={() => { store.addProject({ clientId: form.clientId, name: form.name, scope: form.scope, pricePaise: Math.round(Number(form.price || 0) * 100), dueOn: form.dueOn, assigneeId: form.assigneeId, deliverablesChecklist: form.deliverables.split(",").map((d) => d.trim()).filter(Boolean).map((d) => ({ id: Math.random().toString(36).slice(2), text: d, done: false })) }); onClose(); }}>Create</Button></div>
      </div>
    </Modal>
  );
}
