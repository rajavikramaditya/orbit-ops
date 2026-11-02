"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Input, PageHeader, Pill, Select, Tabs, Textarea } from "@/components/ui";
import { Forbidden } from "@/components/Forbidden";
import { ROLE_LABEL } from "@/lib/rbac";
import { PACKAGES } from "@/lib/demo-data";
import { HealthThresholds, PriorityWeights, UserRole } from "@/lib/types";
import { formatPaiseToINR } from "@/lib/business-rules";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type Tab = "company" | "users" | "packages" | "rules" | "data";

export default function SettingsPage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("company");
  if (!store.can("manage_settings")) return <Forbidden what="Settings (Owners only)" />;
  return (
    <div>
      <PageHeader title="Settings" subtitle="Company details, users & roles, packages, health thresholds, priority weights, numbering, working hours, backups." />
      <Tabs tabs={[{ id: "company", label: "Company & invoices" }, { id: "users", label: "Users & roles" }, { id: "packages", label: "Packages" }, { id: "rules", label: "Business rules" }, { id: "data", label: "Data & backup" }]} value={tab} onChange={setTab} />
      {tab === "company" && <CompanyTab />}
      {tab === "users" && <UsersTab />}
      {tab === "packages" && <PackagesTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "data" && <DataTab />}
    </div>
  );
}

function CompanyTab() {
  const store = useStore();
  const [f, setF] = useState({ ...store.state.settings });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Company">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Legal name (GST registration)"><Input value={f.legalName} onChange={set("legalName")} /></Field>
          <Field label="Brand name"><Input value={f.brandName} onChange={set("brandName")} /></Field>
          <Field label="Header on documents"><Input value={f.headerText} onChange={set("headerText")} /></Field>
          <Field label="Website"><Input value={f.website} onChange={set("website")} /></Field>
          <Field label="GST number"><Input value={f.gstNumber} onChange={set("gstNumber")} /></Field>
          <Field label="Default GST rate %"><Input type="number" value={f.defaultGstRate} onChange={set("defaultGstRate")} /></Field>
        </div>
        <Field label="Registered address"><Textarea value={f.registeredAddress} onChange={set("registeredAddress")} className="min-h-[60px]" /></Field>
      </Card>
      <Card title="Bank details & invoice terms">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Account name"><Input value={f.bankAccountName} onChange={set("bankAccountName")} /></Field>
          <Field label="Bank & branch"><Input value={f.bankName} onChange={set("bankName")} /></Field>
          <Field label="Account number"><Input value={f.bankAccountNumber} onChange={set("bankAccountNumber")} /></Field>
          <Field label="IFSC"><Input value={f.bankIfsc} onChange={set("bankIfsc")} /></Field>
          <Field label="UPI ID"><Input value={f.bankUpiId} onChange={set("bankUpiId")} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Invoice prefix"><Input value={f.invoicePrefix} onChange={set("invoicePrefix")} /></Field>
            <Field label="Next #"><Input type="number" value={f.nextInvoiceSeq} onChange={set("nextInvoiceSeq")} /></Field>
            <Field label="Quotation prefix"><Input value={f.quotationPrefix} onChange={set("quotationPrefix")} /></Field>
            <Field label="Next #"><Input type="number" value={f.nextQuotationSeq} onChange={set("nextQuotationSeq")} /></Field>
          </div>
        </div>
        <Field label="Invoice terms"><Textarea value={f.invoiceTerms} onChange={set("invoiceTerms")} /></Field>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Field label="Working hours start"><Input type="time" value={f.workingHoursStart} onChange={set("workingHoursStart")} /></Field>
          <Field label="Working hours end"><Input type="time" value={f.workingHoursEnd} onChange={set("workingHoursEnd")} /></Field>
        </div>
        <Field label="Working days"><div className="flex flex-wrap gap-1.5 pt-1">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => <button key={d} onClick={() => setF({ ...f, workingDays: f.workingDays.includes(d) ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d] })} className={`pill ${f.workingDays.includes(d) ? "font-semibold border-[var(--fg)]" : ""}`}>{d.slice(0, 3)}</button>)}</div></Field>
      </Card>
      <div className="lg:col-span-2 flex justify-end"><Button onClick={() => store.updateSettings(f)}>Save settings</Button></div>
    </div>
  );
}

function UsersTab() {
  const store = useStore();
  const [inv, setInv] = useState({ name: "", email: "", role: "team" as UserRole, specialty: "" });
  const configured = isSupabaseConfigured();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Team members" className="lg:col-span-2" padded={false}>
        <ul className="divide-y">
          {store.state.team.map((t) => (
            <li key={t.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0"><p className="font-medium text-sm">{t.name} {!t.active && <Pill>inactive</Pill>} {t.twoFactorEnabled && <Pill tone="green">2FA</Pill>}</p><p className="text-xs muted truncate">{t.email} · {t.specialty}</p></div>
              <div className="flex gap-2">
                <Select className="!min-h-[36px] !w-auto text-xs" value={t.role} onChange={(e) => store.updateTeamMember(t.id, { role: e.target.value as UserRole })}>{(["owner", "manager", "team"] as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
                <Button size="sm" variant="ghost" onClick={() => store.updateTeamMember(t.id, { active: !t.active })}>{t.active ? "Deactivate" : "Activate"}</Button>
                {t.role === "owner" && !t.twoFactorEnabled && <Button size="sm" variant="ghost" onClick={() => store.updateTeamMember(t.id, { twoFactorEnabled: true })}>Enable 2FA</Button>}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Invite a user">
        <p className="text-xs muted mb-3">Invite-only. {configured ? "Sends a Supabase Auth magic-link invite." : "Supabase Auth not connected yet — the user is added to the roster and will receive the invite once SUPABASE keys are set in Vercel."}</p>
        <div className="space-y-2">
          <Input placeholder="Full name" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
          <Input placeholder="Email" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
          <Input placeholder="Specialty (optional)" value={inv.specialty} onChange={(e) => setInv({ ...inv, specialty: e.target.value })} />
          <Select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value as UserRole })}>{(["owner", "manager", "team"] as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
          <Button className="w-full" disabled={!inv.name || !inv.email} onClick={async () => { store.inviteTeamMember(inv); await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json", "x-demo-role": store.role }, body: JSON.stringify({ ...inv, invitedBy: store.currentUser.name }) }).catch(() => undefined); setInv({ name: "", email: "", role: "team", specialty: "" }); }}>Send invite</Button>
        </div>
        <div className="mt-4 text-xs muted space-y-1">
          <p><strong>Owner</strong> — everything incl. money, sales, settings, users, permanent delete.</p>
          <p><strong>Manager</strong> — everything except money settings, users, permanent delete. Owns Requests & weekly review.</p>
          <p><strong>Team</strong> — Today, own tasks, assigned clients/content, brand assets. No money, no sales.</p>
        </div>
      </Card>
    </div>
  );
}

function PackagesTab() {
  return (
    <Card title="Package templates">
      <div className="grid gap-3 sm:grid-cols-3">
        {PACKAGES.map((p) => (
          <div key={p.id} className="rounded-xl soft p-4 text-sm">
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs muted">{p.videosPerCycle || "Custom"} videos / cycle · default {formatPaiseToINR(p.defaultFeePaise)}</p>
            <ul className="list-disc pl-4 mt-2 text-xs muted">{p.otherDeliverables.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="text-xs muted mt-3">Templates seed each client&apos;s plan; per-client fee, videos and cycle day are editable on the client&apos;s Plan tab. Add more templates in <code>supabase/seed.sql</code> / <code>src/lib/demo-data.ts</code>.</p>
    </Card>
  );
}

function RulesTab() {
  const store = useStore();
  const [h, setH] = useState<HealthThresholds>({ ...store.state.settings.healthThresholds });
  const [w, setW] = useState<PriorityWeights>({ ...store.state.settings.priorityWeights });
  const num = <T extends object>(obj: T, setObj: (v: T) => void, k: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => setObj({ ...obj, [k]: Number(e.target.value) });
  const hl: Record<keyof HealthThresholds, string> = { greenMaxInactiveDays: "Green: max inactive days", amberMaxInactiveDays: "Amber: max inactive days", redMinInactiveDays: "Red: inactive days ≥", amberBehindItems: "Amber: behind by ≥ items", redBehindItems: "Red: behind by ≥ items", approvalWaitDays: "Approval waiting > days", overdueRedDays: "Red: item overdue > days", requestSlaHours: "Request triage SLA (hours)", weeklyEditCapacity: "Weekly editing capacity (items)" };
  const wl: Record<keyof PriorityWeights, string> = { baseP1: "Base P1", baseP2: "Base P2", baseP3: "Base P3", dueTodayBonus: "+ due today", overduePerDay: "+ per overdue day", overdueMaxBonus: "Overdue cap", clientRedBonus: "+ client red", approvalWaitBonus: "+ approval waiting > 2d", scheduledTodayNotReadyBonus: "+ scheduled today, not ready", todayShootBonus: "+ part of today's shoot" };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Health thresholds"><div className="grid grid-cols-2 gap-3">{(Object.keys(hl) as (keyof HealthThresholds)[]).map((k) => <Field key={k} label={hl[k]}><Input type="number" value={h[k]} onChange={num(h, setH, k)} /></Field>)}</div></Card>
      <Card title="Priority weights"><div className="grid grid-cols-2 gap-3">{(Object.keys(wl) as (keyof PriorityWeights)[]).map((k) => <Field key={k} label={wl[k]}><Input type="number" value={w[k]} onChange={num(w, setW, k)} /></Field>)}</div></Card>
      <div className="lg:col-span-2 flex justify-end"><Button onClick={() => store.updateSettings({ healthThresholds: h, priorityWeights: w })}>Save rules</Button></div>
    </div>
  );
}

function DataTab() {
  const store = useStore();
  const demo = store.state.clients.filter((c) => c.isDemo).length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Demo data">
        <p className="text-sm">{demo} demo clients are loaded (reference names with official spellings from the brief; all other details are placeholders).</p>
        <Button className="mt-3" variant="ghost" disabled={demo === 0} onClick={() => { if (confirm("Delete all demo clients and their content, tasks, requests, invoices and payments?")) store.deleteDemoData(); }}>Delete all demo data</Button>
        <Button className="mt-3 ml-2" variant="ghost" onClick={() => { if (confirm("Reset the local demo database to its initial state?")) store.resetAll(); }}>Reset demo database</Button>
      </Card>
      <Card title="Backups & export">
        <p className="text-sm muted">Use Reports → CSV exports for every table, or the Owner-only full JSON backup. Weekly scheduled export runs via Vercel Cron to Supabase Storage (<code>backups/</code> bucket).</p>
        <p className="text-xs muted mt-3">Storage mode: <strong>{isSupabaseConfigured() ? "Supabase (live)" : "Local demo (browser storage)"}</strong>. See README → “Connect Supabase”.</p>
      </Card>
    </div>
  );
}
