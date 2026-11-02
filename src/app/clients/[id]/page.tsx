"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Link2, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useStore, CLIENT_STATUS_LABEL, STAGE_LABEL, STAGE_ORDER, PROJECT_STATUS_LABEL } from "@/lib/store";
import { useMetrics, useTeamName } from "@/lib/hooks";
import { Avatar, Button, Card, DateText, EmptyState, Field, HealthDot, Input, Pill, ProgressBar, Select, Stat, Tabs, Textarea, cn } from "@/components/ui";
import { amountInWordsINR, checkSpellingGuard, evaluateProfileCompleteness, formatDateDDMMYYYY, formatDateTimeIST, formatPaiseToINR } from "@/lib/business-rules";
import { ContentCard } from "@/components/ContentCard";
import { TaskRow } from "@/components/TaskRow";
import { Comments } from "@/components/Comments";
import { QuickAdd } from "@/components/QuickAdd";
import { Client, ClientBrandAsset, HealthStatus } from "@/lib/types";
import { PACKAGES } from "@/lib/demo-data";
import { MoneyClientPanel } from "@/components/MoneyClientPanel";

type Tab = "overview" | "profile" | "content" | "tasks" | "plan" | "money" | "files" | "timeline";

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const router = useRouter();
  const search = useSearchParams();
  const { byId } = useMetrics();
  const teamName = useTeamName();
  const [tab, setTab] = useState<Tab>((search.get("tab") as Tab) || "overview");
  const [quick, setQuick] = useState<null | "request" | "task" | "content" | "call">(null);

  const client = store.state.clients.find((c) => c.id === id);
  const m = byId.get(id);

  if (!client) {
    return (
      <Card>
        <EmptyState title="Client not found" hint="It may have been moved to Trash." action={<Link href="/clients" className="btn btn-ghost">Back to clients</Link>} />
      </Card>
    );
  }
  if (client.deletedAt) {
    return <Card><EmptyState title="This client is in Trash" action={store.can("restore_trash") ? <Button onClick={() => store.restore("clients", id)}>Restore</Button> : undefined} /></Card>;
  }

  const contacts = store.state.contacts.filter((c) => c.clientId === id);
  const socials = store.state.socials.filter((c) => c.clientId === id);
  const assets = store.state.assets.filter((c) => c.clientId === id);
  const content = store.state.content.filter((c) => c.clientId === id && !c.deletedAt);
  const tasks = store.state.tasks.filter((c) => c.clientId === id && !c.deletedAt);
  const requests = store.state.requests.filter((c) => c.clientId === id && !c.deletedAt);
  const projects = store.state.projects.filter((c) => c.clientId === id && !c.deletedAt);
  const docs = store.state.documents.filter((c) => c.clientId === id && !c.deletedAt);
  const activity = store.state.activity.filter((a) => a.clientId === id).sort((a, b) => b.at.localeCompare(a.at));
  const onboarding = store.state.onboarding.filter((o) => o.clientId === id).sort((a, b) => a.stepOrder - b.stepOrder);
  const completeness = evaluateProfileCompleteness({ client, contacts, socials, assets, plan: m?.plan });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "profile", label: "Profile & brand vault" },
    { id: "content", label: "Content", count: content.filter((c) => c.stage !== "posted").length },
    { id: "tasks", label: "Tasks & requests", count: tasks.filter((t) => t.status !== "done").length + requests.filter((r) => r.triageStatus !== "done").length },
    { id: "plan", label: "Plan & strategy" },
    ...(store.can("view_money") ? [{ id: "money" as Tab, label: "Money" }] : []),
    { id: "files", label: "Files", count: docs.length },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <div>
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm muted hover:text-[var(--fg)] mb-3"><ArrowLeft size={14} /> Clients</Link>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{client.displayName}</h1>
            {m && <HealthDot status={m.health.status} label={m.health.status} />}
            <Pill>{CLIENT_STATUS_LABEL[client.status]}</Pill>
            {client.isDemo && <Pill className="opacity-70">demo</Pill>}
          </div>
          <p className="text-sm muted mt-1">
            Official: <strong className="text-[var(--fg)]">{client.officialName}</strong> · {client.industry} · {client.city} · owner {teamName(client.ownerId)} · onboarded <DateText value={client.onboardedOn} />
          </p>
          {m && <p className="text-xs muted mt-1">{m.health.reasons.join(" · ")}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setQuick("call")}><Phone size={14} /> Log call</Button>
          <Button size="sm" variant="ghost" onClick={() => setQuick("request")}>Request</Button>
          {store.can("manage_tasks") && <Button size="sm" variant="ghost" onClick={() => setQuick("task")}>Task</Button>}
          {store.can("manage_content") && <Button size="sm" onClick={() => setQuick("content")}><Plus size={14} /> Content</Button>}
        </div>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); router.replace(`/clients/${id}?tab=${t}`); }} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Cycle progress" value={m?.progress ? `${m.progress.postedCount} / ${m.progress.promised}` : "—"} hint={m?.progress ? `${formatDateDDMMYYYY(m.progress.cycleStart)} → ${formatDateDDMMYYYY(m.progress.cycleEnd)} · day ${m.progress.daysElapsed}/${m.progress.daysInCycle}` : "No retainer package"} tone={m?.progress?.isBehind ? (m.progress.behindCount >= 3 ? "red" : "amber") : undefined} />
              <Stat label="Last activity" value={m?.inactiveDays === 0 ? "Today" : `${m?.inactiveDays}d ago`} hint={formatDateTimeIST(client.lastActivityAt)} tone={(m?.inactiveDays ?? 0) >= 7 ? "red" : (m?.inactiveDays ?? 0) > 3 ? "amber" : undefined} />
              <Stat label="Open tasks" value={m?.openTasks ?? 0} hint={`${requests.filter((r) => r.triageStatus === "new").length} new requests`} />
            </div>
            {m?.progress && (
              <Card title="Current cycle">
                <ProgressBar value={m.progress.postedCount} max={m.progress.promised} label="Posted" tone={m.progress.isBehind ? (m.progress.behindCount >= 3 ? "red" : "amber") : undefined} />
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div><p className="muted">Expected by today</p><p className="font-semibold tabular-nums">{m.progress.expectedByToday}</p></div>
                  <div><p className="muted">Approved + scheduled</p><p className="font-semibold tabular-nums">{m.progress.approvedAndScheduledCount}</p></div>
                  <div><p className="muted">Status</p><p className={cn("font-semibold", m.progress.isBehind ? "text-[#d97706]" : "text-[#16a34a]")}>{m.progress.isBehind ? `Behind by ${m.progress.behindCount}` : "On track"}</p></div>
                </div>
              </Card>
            )}

            <Card title="Next actions" padded={false}>
              <ul className="divide-y">
                {tasks.filter((t) => t.status !== "done").sort((a, b) => a.dueOn.localeCompare(b.dueOn)).slice(0, 5).map((t) => <TaskRow key={t.id} task={t} showClient={false} />)}
                {tasks.filter((t) => t.status !== "done").length === 0 && <li><EmptyState title="No open tasks" /></li>}
              </ul>
            </Card>

            <Card title="Pipeline snapshot">
              <div className="flex flex-wrap gap-2">
                {STAGE_ORDER.map((s) => {
                  const n = content.filter((c) => c.stage === s).length;
                  return <Pill key={s} className={n === 0 ? "opacity-40" : ""}>{STAGE_LABEL[s]} <strong>{n}</strong></Pill>;
                })}
                {content.filter((c) => c.stage === "revision_requested").length > 0 && <Pill tone="amber">Revision {content.filter((c) => c.stage === "revision_requested").length}</Pill>}
              </div>
            </Card>

            <Card title="Last 10 activities" padded={false}>
              <ActivityList items={activity.slice(0, 10)} />
            </Card>
          </div>

          <div className="space-y-4">
            {client.status === "onboarding" && (
              <Card title={`Onboarding checklist · ${onboarding.filter((o) => o.doneAt).length}/${onboarding.length}`}>
                <ul className="space-y-2">
                  {onboarding.map((o) => (
                    <li key={o.id}>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={Boolean(o.doneAt)} onChange={() => store.toggleOnboardingStep(o.id)} disabled={!store.can("manage_clients")} className="mt-1 h-4 w-4" />
                        <span className={o.doneAt ? "line-through muted" : ""}>{o.step}<span className="block text-[11px] muted no-underline">{teamName(o.ownerId)} · due <DateText value={o.dueOn} /></span></span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title={`Profile completeness · ${completeness.scorePercent}%`}>
              <div className="h-2 rounded-full soft overflow-hidden mb-3"><div className="h-full rounded-full" style={{ width: `${completeness.scorePercent}%`, background: completeness.isComplete ? "#16a34a" : "var(--fg)" }} /></div>
              {completeness.isComplete ? <p className="text-sm text-[#16a34a] font-medium">Complete — every key item is in the vault.</p> : (
                <ul className="space-y-2">
                  {completeness.missingItems.map((i) => (
                    <li key={i.key} className="text-xs">
                      <p className="font-semibold">{i.label}</p>
                      <p className="muted">{i.benefit}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] muted mt-3">Internal only — never shown to the client.</p>
            </Card>

            <Card title="Key contacts">
              {contacts.length === 0 && <p className="text-sm muted">No contacts yet.</p>}
              <ul className="space-y-2">
                {contacts.map((c) => (
                  <li key={c.id} className="text-sm flex items-center justify-between gap-2">
                    <div><p className="font-medium">{c.name}</p><p className="text-xs muted">{c.designation}</p></div>
                    <a href={`tel:${c.phone}`} className="btn btn-ghost btn-sm"><Phone size={13} /> {c.phone}</a>
                  </li>
                ))}
              </ul>
            </Card>

            {store.can("manage_clients") && <HealthOverrideCard client={client} />}
            {store.can("view_money") && (
              <Card title="Client portal">
                <p className="text-xs muted mb-2">Read-only approval link for the client (Phase 3). Share privately.</p>
                <Link href={`/portal/${client.portalToken}`} className="btn btn-ghost btn-sm w-full" target="_blank"><ExternalLink size={13} /> Open portal preview</Link>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "profile" && <ProfileTab client={client} assets={assets} />}

      {tab === "content" && (
        <div>
          {content.length === 0 ? <Card><EmptyState title="No content yet" hint="Add an idea to start the pipeline." action={store.can("manage_content") && <Button onClick={() => setQuick("content")}>Add content</Button>} /></Card> : (
            <div className="space-y-5">
              {[...STAGE_ORDER, "revision_requested", "dropped"].map((s) => {
                const list = content.filter((c) => c.stage === s);
                if (list.length === 0) return null;
                return (
                  <div key={s}>
                    <p className="label">{STAGE_LABEL[s as keyof typeof STAGE_LABEL]} · {list.length}</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((c) => <ContentCard key={c.id} item={c} />)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Tasks · ${tasks.filter((t) => t.status !== "done").length} open`} padded={false}>
            <ul className="divide-y">
              {tasks.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || a.dueOn.localeCompare(b.dueOn)).map((t) => <TaskRow key={t.id} task={t} showClient={false} />)}
              {tasks.length === 0 && <li><EmptyState title="No tasks" /></li>}
            </ul>
          </Card>
          <Card title={`Requests · ${requests.filter((r) => r.triageStatus !== "done").length} open`} padded={false}>
            <ul className="divide-y">
              {requests.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs muted"><Pill>{r.channel}</Pill> {formatDateTimeIST(r.receivedAt)} · logged by {teamName(r.loggedBy)} · <Pill tone={r.triageStatus === "new" ? "amber" : r.triageStatus === "done" ? "green" : "neutral"}>{r.triageStatus.replace("_", " ")}</Pill></div>
                  <p className="text-sm mt-1" lang="hi">{r.body}</p>
                </li>
              ))}
              {requests.length === 0 && <li><EmptyState title="No requests logged" /></li>}
            </ul>
          </Card>
          {projects.length > 0 && (
            <Card title="One-off projects" padded={false} className="lg:col-span-2">
              <ul className="divide-y">
                {projects.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs muted">{p.scope}</p></div>
                    <div className="text-right text-xs"><Pill>{PROJECT_STATUS_LABEL[p.status]}</Pill><p className="muted mt-1">due <DateText value={p.dueOn} />{store.can("view_money") && ` · ${formatPaiseToINR(p.pricePaise)}`}</p></div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "plan" && <PlanTab client={client} />}

      {tab === "money" && store.can("view_money") && <MoneyClientPanel clientId={id} />}

      {tab === "files" && <FilesTab clientId={id} />}

      {tab === "timeline" && (
        <Card title="Complete activity feed" padded={false}>
          <ActivityList items={activity} />
        </Card>
      )}

      <QuickAdd open={quick !== null} onClose={() => setQuick(null)} defaultClientId={id} defaultKind={quick ?? "request"} />
    </div>
  );
}

export function ActivityList({ items, showClient }: { items: { id: string; actorId: string; summary: string; at: string; clientId?: string; entityType: string }[]; showClient?: boolean }) {
  const store = useStore();
  const teamName = useTeamName();
  if (items.length === 0) return <EmptyState title="No activity yet" />;
  return (
    <ul className="divide-y">
      {items.map((a) => (
        <li key={a.id} className="px-4 py-2.5 flex gap-3 items-start">
          <Avatar name={teamName(a.actorId)} />
          <div className="min-w-0 flex-1">
            <p className="text-sm" lang="hi">{a.summary}</p>
            <p className="text-[11px] muted">{teamName(a.actorId)} · {formatDateTimeIST(a.at)} · {a.entityType.replace(/_/g, " ")}{showClient && a.clientId ? ` · ${store.state.clients.find((c) => c.id === a.clientId)?.displayName ?? ""}` : ""}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function HealthOverrideCard({ client }: { client: Client }) {
  const store = useStore();
  const [status, setStatus] = useState<HealthStatus>(client.healthOverride ?? "green");
  const [reason, setReason] = useState(client.healthOverrideReason ?? "");
  const [until, setUntil] = useState(client.healthOverrideUntil?.slice(0, 10) ?? "");
  if (!store.can("manage_money_settings")) return null; // Owners only
  return (
    <Card title="Health override (Owner)">
      {client.healthOverride ? (
        <div className="text-sm">
          <p>Overridden to <strong className="capitalize">{client.healthOverride}</strong> until <DateText value={client.healthOverrideUntil} /></p>
          <p className="text-xs muted">{client.healthOverrideReason}</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => store.updateClient(client.id, { healthOverride: undefined, healthOverrideReason: undefined, healthOverrideUntil: undefined })}>Remove override</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as HealthStatus)}><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></Select>
          <Input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          <Button size="sm" className="w-full" disabled={!reason || !until} onClick={() => store.updateClient(client.id, { healthOverride: status, healthOverrideReason: reason, healthOverrideUntil: until })}>Apply override</Button>
        </div>
      )}
    </Card>
  );
}

function ProfileTab({ client, assets }: { client: Client; assets: ClientBrandAsset[] }) {
  const store = useStore();
  const canEdit = store.can("manage_clients");
  const [form, setForm] = useState({ officialName: client.officialName, displayName: client.displayName, aliases: client.aliases.join(", "), wrongSpellings: client.wrongSpellings.join(", "), tagline: client.tagline ?? "", industry: client.industry, address: client.address ?? "", city: client.city, mapsUrl: client.mapsUrl ?? "", gstNo: client.gstNo ?? "", website: client.website ?? "", languagePref: client.languagePref, voiceToneNotes: client.voiceToneNotes ?? "", status: client.status, ownerId: client.ownerId });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const spelling = useMemo(() => checkSpellingGuard(form.displayName + " " + form.tagline, store.state.clients.filter((c) => c.id !== client.id || true)), [form.displayName, form.tagline, store.state.clients, client.id]);
  const contacts = store.state.contacts.filter((c) => c.clientId === client.id);
  const socials = store.state.socials.filter((c) => c.clientId === client.id);
  const [newContact, setNewContact] = useState({ name: "", designation: "", phone: "" });
  const [newSocial, setNewSocial] = useState({ platform: "Instagram", handle: "" });
  const [newAsset, setNewAsset] = useState({ type: "logo_png", title: "", fileUrl: "", hex: "", fonts: "" });

  const save = () => store.updateClient(client.id, { ...form, aliases: form.aliases.split(",").map((s) => s.trim()).filter(Boolean), wrongSpellings: form.wrongSpellings.split(",").map((s) => s.trim()).filter(Boolean), tagline: form.tagline || undefined, address: form.address || undefined, mapsUrl: form.mapsUrl || undefined, gstNo: form.gstNo || undefined, website: form.website || undefined, voiceToneNotes: form.voiceToneNotes || undefined });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Business profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Official name (exact spelling)"><Input value={form.officialName} onChange={set("officialName")} disabled={!canEdit} lang="hi" /></Field>
          <Field label="Display name"><Input value={form.displayName} onChange={set("displayName")} disabled={!canEdit} /></Field>
          <Field label="Aliases"><Input value={form.aliases} onChange={set("aliases")} disabled={!canEdit} placeholder="comma separated" /></Field>
          <Field label="Wrong spellings to warn about"><Input value={form.wrongSpellings} onChange={set("wrongSpellings")} disabled={!canEdit} placeholder="comma separated" /></Field>
          <Field label="Tagline"><Input value={form.tagline} onChange={set("tagline")} disabled={!canEdit} lang="hi" /></Field>
          <Field label="Industry"><Input value={form.industry} onChange={set("industry")} disabled={!canEdit} /></Field>
          <Field label="Address"><Input value={form.address} onChange={set("address")} disabled={!canEdit} /></Field>
          <Field label="City"><Input value={form.city} onChange={set("city")} disabled={!canEdit} /></Field>
          <Field label="Google Maps link"><Input value={form.mapsUrl} onChange={set("mapsUrl")} disabled={!canEdit} /></Field>
          <Field label="GST number"><Input value={form.gstNo} onChange={set("gstNo")} disabled={!canEdit} /></Field>
          <Field label="Website"><Input value={form.website} onChange={set("website")} disabled={!canEdit} /></Field>
          <Field label="Content language"><Select value={form.languagePref} onChange={set("languagePref")} disabled={!canEdit}><option>Hindi</option><option>Hinglish</option><option>English</option></Select></Field>
          <Field label="Status"><Select value={form.status} onChange={set("status")} disabled={!canEdit}>{Object.entries(CLIENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Account owner"><Select value={form.ownerId} onChange={set("ownerId")} disabled={!canEdit}>{store.state.team.filter((t) => t.role !== "team").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        </div>
        <Field label="Voice & tone notes"><Textarea value={form.voiceToneNotes} onChange={set("voiceToneNotes")} disabled={!canEdit} lang="hi" /></Field>
        {spelling.filter((w) => w.clientId !== client.id || !form.displayName.includes(client.officialName)).map((w) => <p key={w.matchedWrongSpelling} className="text-xs rounded-lg px-3 py-2 pill-amber border mt-2">{w.message}</p>)}
        {client.mapsUrl && <a href={client.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline mt-3"><MapPin size={12} /> Open in Google Maps</a>}
        {canEdit && <div className="flex justify-end mt-4"><Button onClick={save}>Save profile</Button></div>}
      </Card>

      <div className="space-y-4">
        <Card title="Brand vault">
          {assets.length === 0 && <p className="text-sm muted">No brand assets yet.</p>}
          <ul className="space-y-2">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm rounded-lg soft px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title} <span className="muted text-xs">· {a.type.replace("_", " ")}</span></p>
                  {a.hexColours && a.hexColours.length > 0 && <div className="flex gap-1 mt-1">{a.hexColours.map((h) => <span key={h} className="h-5 w-5 rounded-full border" style={{ background: h }} title={h} />)}<span className="text-xs muted ml-1">{a.hexColours.join(" · ")}</span></div>}
                  {a.fontNames && a.fontNames.length > 0 && <p className="text-xs muted">{a.fontNames.join(", ")}</p>}
                </div>
                {a.fileUrl && <a href={a.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Link2 size={13} /></a>}
              </li>
            ))}
          </ul>
          {canEdit && (
            <div className="grid grid-cols-2 gap-2 mt-3 border-t pt-3">
              <Select value={newAsset.type} onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}>
                <option value="logo_png">Logo PNG</option><option value="logo_svg">Logo SVG</option><option value="color_palette">Colour palette</option><option value="font">Fonts</option><option value="guidelines_pdf">Guidelines PDF</option><option value="photo">Photos</option>
              </Select>
              <Input placeholder="Title" value={newAsset.title} onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })} />
              {newAsset.type === "color_palette" ? <Input placeholder="#8B0000, #D4AF37" value={newAsset.hex} onChange={(e) => setNewAsset({ ...newAsset, hex: e.target.value })} className="col-span-2" /> : newAsset.type === "font" ? <Input placeholder="Playfair Display, Noto Sans Devanagari" value={newAsset.fonts} onChange={(e) => setNewAsset({ ...newAsset, fonts: e.target.value })} className="col-span-2" /> : <Input placeholder="Drive / storage link" value={newAsset.fileUrl} onChange={(e) => setNewAsset({ ...newAsset, fileUrl: e.target.value })} className="col-span-2" />}
              <Button size="sm" className="col-span-2" disabled={!newAsset.title} onClick={() => { store.addAsset({ clientId: client.id, type: newAsset.type as ClientBrandAsset["type"], title: newAsset.title, fileUrl: newAsset.fileUrl || undefined, hexColours: newAsset.hex ? newAsset.hex.split(",").map((s) => s.trim()) : undefined, fontNames: newAsset.fonts ? newAsset.fonts.split(",").map((s) => s.trim()) : undefined }); setNewAsset({ type: "logo_png", title: "", fileUrl: "", hex: "", fonts: "" }); }}>Add asset</Button>
            </div>
          )}
          <p className="text-[10px] muted mt-2">Files live in a private Supabase Storage bucket (or Drive). Only images, PDFs, videos & Office docs ≤ 50 MB.</p>
        </Card>

        <Card title="Contacts">
          <ul className="space-y-1.5 text-sm">{contacts.map((c) => <li key={c.id} className="flex justify-between"><span>{c.name} <span className="muted text-xs">· {c.designation}</span></span><a className="underline" href={`tel:${c.phone}`}>{c.phone}</a></li>)}</ul>
          {canEdit && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <Input placeholder="Role" value={newContact.designation} onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })} />
              <Input placeholder="+91 phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              <Button size="sm" className="col-span-3" disabled={!newContact.name || !newContact.phone} onClick={() => { store.addContact({ clientId: client.id, ...newContact, isPrimary: contacts.length === 0 }); setNewContact({ name: "", designation: "", phone: "" }); }}>Add contact</Button>
            </div>
          )}
        </Card>

        <Card title="Social handles">
          <ul className="space-y-1.5 text-sm">{socials.map((s) => <li key={s.id} className="flex justify-between"><span><Pill>{s.platform}</Pill> {s.handle}</span>{s.url && <a href={s.url} target="_blank" rel="noreferrer" className="underline text-xs">open</a>}</li>)}</ul>
          {canEdit && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Select value={newSocial.platform} onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}><option>Instagram</option><option>Facebook</option><option>YouTube</option><option>Google Business</option><option>Website</option></Select>
              <Input placeholder="@handle" value={newSocial.handle} onChange={(e) => setNewSocial({ ...newSocial, handle: e.target.value })} className="col-span-2" />
              <Button size="sm" className="col-span-3" disabled={!newSocial.handle} onClick={() => { store.addSocial({ clientId: client.id, platform: newSocial.platform as "Instagram", handle: newSocial.handle }); setNewSocial({ platform: "Instagram", handle: "" }); }}>Add handle</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PlanTab({ client }: { client: Client }) {
  const store = useStore();
  const canEdit = store.can("manage_clients");
  const plan = store.state.plans.find((p) => p.clientId === client.id && p.active);
  const [form, setForm] = useState({ researchStrengths: client.researchStrengths ?? "", researchGaps: client.researchGaps ?? "", researchCompetitors: client.researchCompetitors ?? "", proposalSummary: client.proposalSummary ?? "", growthPlan: client.growthPlan ?? "", monthlyPlan: client.monthlyPlan ?? "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const [pkgForm, setPkgForm] = useState({ packageId: plan?.packageTemplateId ?? "pkg-8", fee: String((plan?.monthlyFeePaise ?? 0) / 100), videos: String(plan?.videosPerCycle ?? 8), cycleDay: String(plan?.cycleDay ?? 1), gst: plan?.gstApplicable === false ? "no" : "yes" });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Research">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Strengths"><Textarea value={form.researchStrengths} onChange={set("researchStrengths")} disabled={!canEdit} lang="hi" /></Field>
            <Field label="Weaknesses & gaps"><Textarea value={form.researchGaps} onChange={set("researchGaps")} disabled={!canEdit} lang="hi" /></Field>
            <Field label="Competitors"><Textarea value={form.researchCompetitors} onChange={set("researchCompetitors")} disabled={!canEdit} lang="hi" /></Field>
          </div>
        </Card>
        <Card title="Proposal, growth plan & monthly plan">
          <Field label="Proposal summary"><Textarea value={form.proposalSummary} onChange={set("proposalSummary")} disabled={!canEdit} lang="hi" /></Field>
          <Field label="Growth plan"><Textarea value={form.growthPlan} onChange={set("growthPlan")} disabled={!canEdit} className="min-h-[120px]" lang="hi" /></Field>
          <Field label="This month's plan"><Textarea value={form.monthlyPlan} onChange={set("monthlyPlan")} disabled={!canEdit} className="min-h-[120px]" lang="hi" /></Field>
          {canEdit && <div className="flex justify-end mt-3"><Button onClick={() => store.updateClient(client.id, form)}>Save plan</Button></div>}
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Package">
          {plan ? (
            <div className="text-sm space-y-1">
              <p className="font-semibold">{plan.packageName}</p>
              <p className="muted text-xs">{plan.videosPerCycle} videos / cycle · cycle day {plan.cycleDay} · since <DateText value={plan.startsOn} /></p>
              {store.can("view_money") && <p>{formatPaiseToINR(plan.monthlyFeePaise)} / month {plan.gstApplicable ? "+ GST" : "(no GST)"}</p>}
              <ul className="list-disc pl-4 text-xs muted mt-2">{plan.otherDeliverables.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          ) : <p className="text-sm muted">No retainer package. This client is one-off only.</p>}
          {store.can("manage_money") && (
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
              <Select value={pkgForm.packageId} onChange={(e) => { const p = PACKAGES.find((x) => x.id === e.target.value)!; setPkgForm({ ...pkgForm, packageId: p.id, videos: String(p.videosPerCycle || pkgForm.videos), fee: String(p.defaultFeePaise / 100) }); }} className="col-span-2">{PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <Input type="number" placeholder="Fee ₹" value={pkgForm.fee} onChange={(e) => setPkgForm({ ...pkgForm, fee: e.target.value })} />
              <Input type="number" placeholder="Videos" value={pkgForm.videos} onChange={(e) => setPkgForm({ ...pkgForm, videos: e.target.value })} />
              <Input type="number" min={1} max={28} placeholder="Cycle day" value={pkgForm.cycleDay} onChange={(e) => setPkgForm({ ...pkgForm, cycleDay: e.target.value })} />
              <Select value={pkgForm.gst} onChange={(e) => setPkgForm({ ...pkgForm, gst: e.target.value })}><option value="yes">GST yes</option><option value="no">GST no</option></Select>
              <Button size="sm" className="col-span-2" onClick={() => { const p = PACKAGES.find((x) => x.id === pkgForm.packageId)!; store.upsertPlan({ id: plan?.id, clientId: client.id, packageTemplateId: p.id, packageName: p.name, monthlyFeePaise: Math.round(Number(pkgForm.fee) * 100), videosPerCycle: Number(pkgForm.videos), otherDeliverables: p.otherDeliverables, cycleDay: Number(pkgForm.cycleDay), startsOn: plan?.startsOn ?? store.today, gstApplicable: pkgForm.gst === "yes", active: true }); }}>Save package</Button>
            </div>
          )}
        </Card>
        <Card title="Notes">
          <Comments entityType="client" entityId={client.id} clientId={client.id} />
        </Card>
      </div>
    </div>
  );
}

function FilesTab({ clientId }: { clientId: string }) {
  const store = useStore();
  const teamName = useTeamName();
  const docs = store.state.documents.filter((d) => d.clientId === clientId && !d.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [form, setForm] = useState({ kind: "proposal", title: "", url: "" });
  const canEdit = store.can("manage_clients");
  return (
    <Card title="Files & documents" action={<span className="text-xs muted">Versioned · Drive links welcome for raw footage</span>} padded={false}>
      <ul className="divide-y">
        {docs.map((d) => (
          <li key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{d.title} <Pill>v{d.version}</Pill></p>
              <p className="text-xs muted">{d.kind.replace("_", " ")} · {teamName(d.createdBy)} · {formatDateDDMMYYYY(d.createdAt)}</p>
            </div>
            <div className="flex gap-1">
              <a href={d.filePathOrUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13} /></a>
              {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => store.softDelete("documents", d.id)}><Trash2 size={13} /></button>}
            </div>
          </li>
        ))}
        {docs.length === 0 && <li><EmptyState title="No files yet" /></li>}
      </ul>
      {canEdit && (
        <div className="p-4 border-t grid gap-2 sm:grid-cols-4">
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="proposal">Proposal</option><option value="brand_pdf">Brand PDF</option><option value="invoice">Invoice</option><option value="contract">Contract</option><option value="drive_link">Drive link</option><option value="other">Other</option></Select>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="https://drive.google.com/…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <Button size="sm" disabled={!form.title || !form.url} onClick={() => { store.addDocument({ clientId, kind: form.kind as "proposal", title: form.title, filePathOrUrl: form.url }); setForm({ kind: "proposal", title: "", url: "" }); }}>Add file</Button>
        </div>
      )}
    </Card>
  );
}

export { amountInWordsINR };
