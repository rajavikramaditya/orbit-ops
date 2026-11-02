"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { useStore, LEAD_STAGE_LABEL, LEAD_STAGE_ORDER } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, Card, DateText, Field, Input, Modal, PageHeader, Pill, Select, Stat, Textarea, cn } from "@/components/ui";
import { formatPaiseToINR } from "@/lib/business-rules";
import { Forbidden } from "@/components/Forbidden";
import { Lead } from "@/lib/types";
import { PACKAGES } from "@/lib/demo-data";

export default function SalesPage() {
  const store = useStore();
  const teamName = useTeamName();
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  if (!store.can("view_sales")) return <Forbidden what="the Sales pipeline (Owners only)" />;

  const leads = store.state.leads.filter((l) => !l.deletedAt);
  const open = leads.filter((l) => !["won", "lost"].includes(l.stage));
  const pipelineValue = open.reduce((a, l) => a + l.estimatedValuePaise, 0);
  const won = leads.filter((l) => l.stage === "won").length;
  const lost = leads.filter((l) => l.stage === "lost").length;
  const dueToday = open.filter((l) => l.nextFollowUpOn && l.nextFollowUpOn <= store.today).length;

  const sources = ["referral", "outreach", "inbound", "social"].map((s) => ({ s, n: leads.filter((l) => l.source === s).length, won: leads.filter((l) => l.source === s && l.stage === "won").length }));
  const referrers = Array.from(new Set(leads.filter((l) => l.referredByClientId).map((l) => l.referredByClientId!))).map((cid) => ({ cid, n: leads.filter((l) => l.referredByClientId === cid).length }));

  const selected = leads.find((l) => l.id === sel);

  return (
    <div>
      <PageHeader title="Sales pipeline" subtitle="Owners only · research → proposal → follow-up → negotiation → won" actions={<Button onClick={() => setAdding(true)}><Plus size={16} /> Lead</Button>} />
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Stat label="Open pipeline" value={formatPaiseToINR(pipelineValue)} hint={`${open.length} open leads`} />
        <Stat label="Follow-ups due" value={dueToday} tone={dueToday > 0 ? "amber" : undefined} hint="today or earlier" />
        <Stat label="Won" value={won} tone="green" />
        <Stat label="Lost" value={lost} hint={lost ? leads.filter((l) => l.stage === "lost").map((l) => l.lostReason).filter(Boolean).slice(0, 1).join("") : undefined} />
      </div>

      <div className="scroll-x -mx-3 px-3 pb-3">
        <div className="flex gap-3 min-w-max">
          {LEAD_STAGE_ORDER.map((st) => {
            const col = leads.filter((l) => l.stage === st);
            return (
              <div key={st} className="kanban-col rounded-2xl soft p-2.5">
                <div className="flex items-center justify-between px-1 mb-2"><p className={cn("text-xs font-semibold uppercase tracking-wide", st === "won" && "text-[#16a34a]", st === "lost" && "text-[#dc2626]")}>{LEAD_STAGE_LABEL[st]}</p><span className="text-xs muted">{col.length}</span></div>
                <div className="space-y-2 min-h-[80px]">
                  {col.map((l) => {
                    const late = l.nextFollowUpOn && l.nextFollowUpOn < store.today && !["won", "lost"].includes(l.stage);
                    return (
                      <button key={l.id} onClick={() => setSel(l.id)} className="card p-3 text-left w-full text-sm">
                        <p className="font-medium">{l.businessName}</p>
                        <p className="text-xs muted">{l.contactName} · {l.serviceInterest}</p>
                        <div className="flex items-center justify-between mt-2 text-[11px]">
                          <span className="flex items-center gap-1"><Avatar name={teamName(l.ownerId)} /> <Pill>{l.source}</Pill></span>
                          <span className="font-medium tabular-nums">{formatPaiseToINR(l.estimatedValuePaise)}</span>
                        </div>
                        {l.nextFollowUpOn && !["won", "lost"].includes(l.stage) && <p className={cn("text-[11px] mt-1", late ? "text-[#dc2626] font-medium" : "muted")}>Follow-up <DateText value={l.nextFollowUpOn} /></p>}
                        {l.stage === "lost" && l.lostReason && <p className="text-[11px] muted mt-1">{l.lostReason}</p>}
                        {l.stage === "won" && l.convertedClientId && <Link href={`/clients/${l.convertedClientId}`} className="text-[11px] underline mt-1 block" onClick={(e) => e.stopPropagation()}>Open client →</Link>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-2">
        <Card title="Lead sources">
          <ul className="text-sm space-y-1.5">{sources.map((s) => <li key={s.s} className="flex justify-between"><span className="capitalize">{s.s}</span><span className="muted tabular-nums">{s.n} leads · {s.won} won</span></li>)}</ul>
        </Card>
        <Card title="Referrals by client">
          {referrers.length === 0 ? <p className="text-sm muted">No referrals tracked yet.</p> : <ul className="text-sm space-y-1.5">{referrers.map((r) => <li key={r.cid} className="flex justify-between"><Link href={`/clients/${r.cid}`} className="hover:underline">{store.state.clients.find((c) => c.id === r.cid)?.displayName}</Link><span className="muted tabular-nums">{r.n} referral{r.n === 1 ? "" : "s"}</span></li>)}</ul>}
        </Card>
      </div>

      <NewLeadModal open={adding} onClose={() => setAdding(false)} />
      {selected && <LeadDetail lead={selected} onClose={() => setSel(null)} />}
    </div>
  );
}

function LeadDetail({ lead: l, onClose }: { lead: Lead; onClose: () => void }) {
  const store = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ ...l, weaknessesAndGaps: l.weaknessesAndGaps ?? "", competitorFindings: l.competitorFindings ?? "", socialAdAudit: l.socialAdAudit ?? "", followUpNote: l.followUpNote ?? "", nextFollowUpOn: l.nextFollowUpOn ?? "", proposalUrl: l.proposalUrl ?? "", lostReason: l.lostReason ?? "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const [winOpen, setWinOpen] = useState(false);
  const [pkgId, setPkgId] = useState("pkg-8");
  const [fee, setFee] = useState(String(l.estimatedValuePaise / 100));
  const [cycleDay, setCycleDay] = useState(String(Math.min(28, new Date().getDate())));

  const save = () => { store.updateLead(l.id, { ...form, nextFollowUpOn: form.nextFollowUpOn || undefined, estimatedValuePaise: Number(form.estimatedValuePaise) }); onClose(); };
  const win = () => { const p = PACKAGES.find((x) => x.id === pkgId)!; const c = store.winLead(l.id, { packageTemplateId: p.id, packageName: p.name, videosPerCycle: p.videosPerCycle, monthlyFeePaise: Math.round(Number(fee) * 100), cycleDay: Number(cycleDay), otherDeliverables: p.otherDeliverables, gstApplicable: true }); onClose(); router.push(`/clients/${c.id}`); };

  return (
    <Modal open onClose={onClose} title={l.businessName} wide>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact"><Input value={form.contactName} onChange={set("contactName")} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
            <Field label="Stage"><Select value={form.stage} onChange={set("stage")}>{LEAD_STAGE_ORDER.filter((s) => s !== "won").map((s) => <option key={s} value={s}>{LEAD_STAGE_LABEL[s]}</option>)}</Select></Field>
            <Field label="Owner"><Select value={form.ownerId} onChange={set("ownerId")}>{store.state.team.filter((t) => t.role === "owner").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            <Field label="Source"><Select value={form.source} onChange={set("source")}><option value="referral">Referral</option><option value="outreach">Our outreach</option><option value="inbound">Inbound</option><option value="social">Social</option></Select></Field>
            <Field label="Referred by client"><Select value={form.referredByClientId ?? ""} onChange={(e) => setForm({ ...form, referredByClientId: e.target.value || undefined })}><option value="">—</option>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select></Field>
            <Field label="Service interest"><Input value={form.serviceInterest} onChange={set("serviceInterest")} /></Field>
            <Field label="Estimated value (₹/month)"><Input type="number" value={form.estimatedValuePaise / 100} onChange={(e) => setForm({ ...form, estimatedValuePaise: Math.round(Number(e.target.value) * 100) })} /></Field>
            <Field label="Next follow-up"><Input type="date" value={form.nextFollowUpOn} onChange={set("nextFollowUpOn")} /></Field>
            <Field label="Follow-up note"><Input value={form.followUpNote} onChange={set("followUpNote")} lang="hi" /></Field>
          </div>
          <Field label="Proposal link"><Input value={form.proposalUrl} onChange={set("proposalUrl")} placeholder="https://drive.google.com/…" /></Field>
          {form.stage === "lost" && <Field label="Lost reason"><Input value={form.lostReason} onChange={set("lostReason")} /></Field>}
        </div>
        <div className="space-y-3">
          <p className="label">Research notes</p>
          <Field label="Their weaknesses & gaps"><Textarea value={form.weaknessesAndGaps} onChange={set("weaknessesAndGaps")} lang="hi" /></Field>
          <Field label="Competitor findings"><Textarea value={form.competitorFindings} onChange={set("competitorFindings")} lang="hi" /></Field>
          <Field label="Social & ad audit"><Textarea value={form.socialAdAudit} onChange={set("socialAdAudit")} lang="hi" /></Field>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-2 mt-5">
        <div className="flex gap-2">
          {l.stage !== "won" && (
            <Button variant="ghost" onClick={() => setWinOpen(!winOpen)}><Trophy size={14} /> Mark won → create client</Button>
          )}
          <button className="text-xs muted underline" onClick={() => { store.softDelete("leads", l.id); onClose(); }}>Trash</button>
        </div>
        <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save</Button></div>
      </div>
      {winOpen && (
        <div className="mt-4 rounded-xl soft p-4 grid gap-3 sm:grid-cols-4 items-end fade-in">
          <Field label="Package"><Select value={pkgId} onChange={(e) => setPkgId(e.target.value)}>{PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Monthly fee ₹"><Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
          <Field label="Billing day"><Input type="number" min={1} max={28} value={cycleDay} onChange={(e) => setCycleDay(e.target.value)} /></Field>
          <Button onClick={win}>Convert to client</Button>
          <p className="sm:col-span-4 text-xs muted">Creates the client with the package, copies research notes, and generates the 9-step onboarding checklist.</p>
        </div>
      )}
    </Modal>
  );
}

function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [form, setForm] = useState({ businessName: "", contactName: "", phone: "", city: "Orai", industry: "", source: "outreach" as Lead["source"], referredByClientId: "", serviceInterest: "", value: "", ownerId: store.currentUser.id, nextFollowUpOn: store.today });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="New lead" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name"><Input value={form.businessName} onChange={set("businessName")} lang="hi" /></Field>
        <Field label="Contact person"><Input value={form.contactName} onChange={set("contactName")} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="City"><Input value={form.city} onChange={set("city")} /></Field>
        <Field label="Industry"><Input value={form.industry} onChange={set("industry")} /></Field>
        <Field label="Service interest"><Input value={form.serviceInterest} onChange={set("serviceInterest")} placeholder="12 videos retainer + ads" /></Field>
        <Field label="Source"><Select value={form.source} onChange={set("source")}><option value="referral">Referral</option><option value="outreach">Our outreach</option><option value="inbound">Inbound</option><option value="social">Social</option></Select></Field>
        <Field label="Referred by (client)"><Select value={form.referredByClientId} onChange={set("referredByClientId")}><option value="">—</option>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select></Field>
        <Field label="Estimated value (₹/month)"><Input type="number" value={form.value} onChange={set("value")} /></Field>
        <Field label="Owner"><Select value={form.ownerId} onChange={set("ownerId")}>{store.state.team.filter((t) => t.role === "owner").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Next follow-up"><Input type="date" value={form.nextFollowUpOn} onChange={set("nextFollowUpOn")} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!form.businessName || !form.contactName} onClick={() => { store.addLead({ ...form, referredByClientId: form.referredByClientId || undefined, estimatedValuePaise: Math.round(Number(form.value || 0) * 100) }); onClose(); }}>Add lead</Button></div>
    </Modal>
  );
}
