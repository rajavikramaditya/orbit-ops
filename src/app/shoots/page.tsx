"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Plus } from "lucide-react";
import { useStore, STAGE_LABEL } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, Card, DateText, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea, cn } from "@/components/ui";
import { editingLoadByWeek } from "@/lib/selectors";
import { ShootDay, ShootItem } from "@/lib/types";

export default function ShootsPage() {
  const store = useStore();
  const teamName = useTeamName();
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const shoots = store.state.shoots.filter((s) => !s.deletedAt).sort((a, b) => a.shootDate.localeCompare(b.shootDate));
  const upcoming = shoots.filter((s) => s.status === "planned" && s.shootDate >= store.today);
  const past = shoots.filter((s) => s.status !== "planned" || s.shootDate < store.today).reverse();
  const load = editingLoadByWeek(store.state, store.today);
  const isFriday = new Date(store.today).getDay() === 5;
  const nextWeekHasShoot = shoots.some((s) => s.status === "planned" && s.shootDate > store.today && s.shootDate <= addDays(store.today, 7));

  return (
    <div>
      <PageHeader title="Weekly shoot planner" subtitle="One shoot day per week captures the next week's content for several clients. Completing a shoot moves items to Shot and creates editing tasks automatically." actions={store.can("manage_shoots") && <Button onClick={() => setAdding(true)}><Plus size={16} /> Plan shoot day</Button>} />

      {toast && <p className="mb-4 text-sm rounded-xl px-4 py-3 pill-green border fade-in flex items-center gap-2"><CheckCircle2 size={16} /> {toast}</p>}
      {isFriday && !nextWeekHasShoot && store.can("manage_shoots") && <p className="mb-4 text-sm rounded-xl px-4 py-3 pill-amber border">It&apos;s Friday — plan next week&apos;s shoot. No shoot is scheduled for the coming 7 days.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          {upcoming.length === 0 && <Card><EmptyState title="No shoot planned" hint="Plan the next shoot day so editing and posting stay on schedule." /></Card>}
          {upcoming.map((s) => <ShootCard key={s.id} shoot={s} teamName={teamName} onCompleted={(n) => setToast(`Shoot completed · ${n} editing task${n === 1 ? "" : "s"} created for Prathmes.`)} />)}
          <h2 className="text-sm font-semibold pt-2">Past</h2>
          {past.length === 0 && <p className="text-sm muted">No past shoots.</p>}
          {past.map((s) => <ShootCard key={s.id} shoot={s} teamName={teamName} onCompleted={() => undefined} />)}
        </div>
        <div className="space-y-4">
          <Card title="Editing capacity">
            <p className="text-xs muted mb-3">Items due for editing per week vs. capacity ({store.state.settings.healthThresholds.weeklyEditCapacity}/week). Warning when over.</p>
            <ul className="space-y-2">
              {load.map((w, i) => (
                <li key={w.weekStart}>
                  <div className="flex justify-between text-xs mb-1"><span>{i === 0 ? "This week" : i === 1 ? "Next week" : "Week after"} · from <DateText value={w.weekStart} /></span><span className={cn("font-semibold tabular-nums", w.count > w.capacity && "text-[#dc2626]")}>{w.count}/{w.capacity}</span></div>
                  <div className="h-2 rounded-full soft overflow-hidden"><div className={cn("h-full", w.count > w.capacity ? "bg-[#dc2626]" : w.count > w.capacity * 0.8 ? "bg-[#d97706]" : "bg-[var(--fg)]")} style={{ width: `${Math.min(100, (w.count / w.capacity) * 100)}%` }} /></div>
                  {w.count > w.capacity && <p className="text-[11px] text-[#dc2626] mt-1">Over capacity — spread shoots or move due dates.</p>}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Default crew">
            <ul className="text-sm space-y-1.5">
              {["u-tosseeb", "u-rohit"].map((id) => <li key={id} className="flex items-center gap-2"><Avatar name={teamName(id)} /> {teamName(id)} <span className="muted text-xs">· {store.state.team.find((t) => t.id === id)?.specialty}</span></li>)}
            </ul>
          </Card>
        </div>
      </div>

      <NewShootModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function addDays(ymd: string, n: number) { const d = new Date(ymd); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

function ShootCard({ shoot, teamName, onCompleted }: { shoot: ShootDay; teamName: (id?: string) => string; onCompleted: (n: number) => void }) {
  const store = useStore();
  const clients = Array.from(new Set(shoot.items.map((i) => i.clientId)));
  const isToday = shoot.shootDate === store.today;
  return (
    <Card className={cn(isToday && "border-[var(--fg)]")}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="font-semibold flex items-center gap-2"><Camera size={16} /> <DateText value={shoot.shootDate} /> · {shoot.startTime} {isToday && <Pill>Today</Pill>} <Pill tone={shoot.status === "completed" ? "green" : shoot.status === "cancelled" ? "red" : "neutral"}>{shoot.status}</Pill></p>
          <p className="text-sm mt-0.5">{shoot.location}</p>
          {shoot.equipmentNotes && <p className="text-xs muted mt-0.5">Gear: {shoot.equipmentNotes}</p>}
          {shoot.notes && <p className="text-xs muted" lang="hi">{shoot.notes}</p>}
          <div className="flex items-center gap-1.5 mt-2 text-xs"><span className="flex -space-x-1.5">{shoot.crew.map((c) => <Avatar key={c} name={teamName(c)} />)}</span><span className="muted pl-2">{shoot.crew.map(teamName).join(", ")}</span></div>
        </div>
        {shoot.status === "planned" && store.can("manage_shoots") && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => store.updateShoot(shoot.id, { status: "cancelled" })}>Cancel</Button>
            <Button size="sm" onClick={() => { const r = store.completeShoot(shoot.id); onCompleted(r.editingTasksCreated); }}><CheckCircle2 size={14} /> Mark complete</Button>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {clients.map((cid) => {
          const c = store.state.clients.find((x) => x.id === cid);
          const items = shoot.items.filter((i) => i.clientId === cid);
          return (
            <div key={cid} className="rounded-xl soft p-3">
              <Link href={`/clients/${cid}`} className="text-xs font-semibold uppercase tracking-wide hover:underline">{c?.displayName}</Link>
              <ul className="mt-1.5 space-y-1.5">
                {items.map((i) => {
                  const ci = store.state.content.find((x) => x.id === i.contentItemId);
                  return (
                    <li key={i.id} className="text-xs">
                      <p className="font-medium" lang="hi">{ci?.title ?? "Shot list"} {ci && <span className="muted font-normal">· {STAGE_LABEL[ci.stage]}</span>}</p>
                      <p className="muted" lang="hi">{i.shotList}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {clients.length === 0 && <p className="text-xs muted">No clients attached.</p>}
      </div>
    </Card>
  );
}

function NewShootModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [form, setForm] = useState({ shootDate: addDays(store.today, 1), startTime: "10:00 AM", location: "", equipmentNotes: "", notes: "", crew: ["u-tosseeb", "u-rohit"] as string[] });
  const [items, setItems] = useState<{ clientId: string; contentItemId: string; shotList: string }[]>([]);
  const [draft, setDraft] = useState({ clientId: store.state.clients[0]?.id ?? "", contentItemId: "", shotList: "" });
  const candidates = store.state.content.filter((c) => c.clientId === draft.clientId && !c.deletedAt && ["idea", "planned_for_shoot"].includes(c.stage));

  const submit = () => {
    store.addShoot({ ...form, items: items.map((i, idx) => ({ id: `si-${Date.now()}-${idx}`, shootId: "", clientId: i.clientId, contentItemId: i.contentItemId || undefined, shotList: i.shotList })) as ShootItem[] });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Plan shoot day" wide>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date"><Input type="date" value={form.shootDate} onChange={(e) => setForm({ ...form, shootDate: e.target.value })} /></Field>
        <Field label="Start time"><Input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
        <Field label="Location(s)"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Five Brothers → Purwar Electricals" /></Field>
        <Field label="Equipment notes"><Input value={form.equipmentNotes} onChange={(e) => setForm({ ...form, equipmentNotes: e.target.value })} placeholder="A7IV, gimbal, LED panels" /></Field>
        <Field label="Crew">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {store.state.team.filter((t) => t.active).map((t) => (
              <button key={t.id} onClick={() => setForm({ ...form, crew: form.crew.includes(t.id) ? form.crew.filter((c) => c !== t.id) : [...form.crew, t.id] })} className={cn("pill", form.crew.includes(t.id) && "font-semibold border-[var(--fg)]")}>{t.name}</button>
            ))}
          </div>
        </Field>
        <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[44px]" lang="hi" /></Field>
      </div>
      <div className="mt-4">
        <p className="label">Clients & shot lists</p>
        <ul className="space-y-1.5 mb-2">
          {items.map((i, idx) => <li key={idx} className="text-sm rounded-lg soft px-3 py-2 flex justify-between gap-2"><span><strong>{store.state.clients.find((c) => c.id === i.clientId)?.displayName}</strong> · {store.state.content.find((c) => c.id === i.contentItemId)?.title ?? "(new)"} — <span className="muted" lang="hi">{i.shotList}</span></span><button className="text-xs underline" onClick={() => setItems(items.filter((_, j) => j !== idx))}>remove</button></li>)}
        </ul>
        <div className="grid gap-2 sm:grid-cols-4">
          <Select value={draft.clientId} onChange={(e) => setDraft({ ...draft, clientId: e.target.value, contentItemId: "" })}>{store.state.clients.filter((c) => !c.deletedAt && c.status !== "churned").map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select>
          <Select value={draft.contentItemId} onChange={(e) => setDraft({ ...draft, contentItemId: e.target.value })}><option value="">— content item —</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select>
          <Input value={draft.shotList} onChange={(e) => setDraft({ ...draft, shotList: e.target.value })} placeholder="Shot list (Hindi ok)" lang="hi" />
          <Button size="sm" variant="ghost" disabled={!draft.shotList} onClick={() => { setItems([...items, draft]); setDraft({ ...draft, contentItemId: "", shotList: "" }); }}>Add</Button>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!form.location} onClick={submit}>Create shoot day</Button></div>
    </Modal>
  );
}
