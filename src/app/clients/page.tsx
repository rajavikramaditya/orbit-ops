"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { useStore, CLIENT_STATUS_LABEL } from "@/lib/store";
import { useMetrics, useTeamName } from "@/lib/hooks";
import { Avatar, Button, Card, EmptyState, Field, HealthDot, Input, Modal, PageHeader, Pill, ProgressBar, Select, Textarea, cn } from "@/components/ui";
import { formatDateDDMMYYYY, formatPaiseToINR } from "@/lib/business-rules";
import { fuzzyIncludes } from "@/lib/selectors";
import { PACKAGES } from "@/lib/demo-data";
import { Client, HealthStatus } from "@/lib/types";
import { CsvImport } from "@/components/CsvImport";

export default function ClientsPage() {
  const store = useStore();
  const { metrics } = useMetrics();
  const teamName = useTeamName();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [health, setHealth] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [service, setService] = useState<string>("all");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const rows = useMemo(() => {
    return metrics
      .filter((m) => (status === "all" ? true : m.client.status === status))
      .filter((m) => (health === "all" ? true : m.health.status === health))
      .filter((m) => (owner === "all" ? true : m.client.ownerId === owner))
      .filter((m) => (service === "all" ? true : m.client.engagementType === service || m.client.engagementType === "both"))
      .filter((m) => !q || [m.client.officialName, m.client.displayName, ...m.client.aliases, ...m.client.wrongSpellings, m.client.industry].some((v) => fuzzyIncludes(v ?? "", q)))
      .sort((a, b) => {
        const rank: Record<HealthStatus, number> = { red: 0, amber: 1, green: 2 };
        return rank[a.health.status] - rank[b.health.status] || b.inactiveDays - a.inactiveDays;
      });
  }, [metrics, q, status, health, owner, service]);

  const counts = { red: metrics.filter((m) => m.health.status === "red").length, amber: metrics.filter((m) => m.health.status === "amber").length, green: metrics.filter((m) => m.health.status === "green").length };

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${metrics.length} clients · ${counts.red} red · ${counts.amber} amber · ${counts.green} green`}
        actions={
          store.can("manage_clients") && (
            <>
              <Button variant="ghost" onClick={() => setImporting(true)}>
                <Upload size={16} /> Import CSV
              </Button>
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} /> New client
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-2 sm:grid-cols-5 mb-4">
        <Input placeholder="Search (Hindi ok · misspellings ok)" value={q} onChange={(e) => setQ(e.target.value)} className="sm:col-span-2" lang="hi" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(CLIENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={health} onChange={(e) => setHealth(e.target.value)}>
          <option value="all">All health</option>
          <option value="red">Red</option>
          <option value="amber">Amber</option>
          <option value="green">Green</option>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">Any owner</option>
            {store.state.team.filter((t) => t.role !== "team").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="all">All services</option>
            <option value="retainer">Retainer</option>
            <option value="one_off">One-off</option>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState title="No clients match" hint={q ? `Nothing found for “${q}”.` : "Add your first client or import a CSV."} action={store.can("manage_clients") && <Button onClick={() => setAdding(true)}>New client</Button>} /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((m) => (
            <Link key={m.client.id} href={`/clients/${m.client.id}`} className="card p-4 hover:shadow-md transition block">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{m.client.displayName}</p>
                  <p className="text-xs muted truncate">{m.client.industry || "—"} · {m.client.city}</p>
                </div>
                <HealthDot status={m.health.status} label={m.health.status} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Pill>{CLIENT_STATUS_LABEL[m.client.status]}</Pill>
                {m.plan && <Pill>{m.plan.packageName}</Pill>}
                {m.client.isDemo && <Pill className="opacity-70">demo</Pill>}
              </div>
              <div className="mt-3">
                {m.progress ? (
                  <ProgressBar value={m.progress.postedCount} max={m.progress.promised} label={`Cycle ${formatDateDDMMYYYY(m.progress.cycleStart)} → ${formatDateDDMMYYYY(m.progress.cycleEnd)}`} tone={m.progress.behindCount >= 3 ? "red" : m.progress.isBehind ? "amber" : undefined} />
                ) : (
                  <p className="text-xs muted">One-off / no retainer package</p>
                )}
                {m.progress?.isBehind && <p className="text-[11px] text-[#d97706] mt-1 font-medium">Behind by {m.progress.behindCount} · expected {m.progress.expectedByToday} by today</p>}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs muted">
                <span>Onboarded <span className="tabular-nums">{formatDateDDMMYYYY(m.client.onboardedOn)}</span></span>
                <span className={cn("font-medium", m.inactiveDays >= 7 ? "text-[#dc2626]" : m.inactiveDays > 3 ? "text-[#d97706]" : "")}>{m.inactiveDays === 0 ? "Active today" : `${m.inactiveDays} days ago`}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                <span className="flex items-center gap-1.5"><Avatar name={teamName(m.client.ownerId)} /> {teamName(m.client.ownerId)}</span>
                <span className="muted">{m.openTasks} open task{m.openTasks === 1 ? "" : "s"}{store.can("view_money") && m.balanceDuePaise > 0 ? ` · due ${formatPaiseToINR(m.balanceDuePaise)}` : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewClientModal open={adding} onClose={() => setAdding(false)} />
      <Modal open={importing} onClose={() => setImporting(false)} title="Import clients from CSV" wide>
        <CsvImport kind="clients" onDone={() => setImporting(false)} />
      </Modal>
    </div>
  );
}

export function NewClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [form, setForm] = useState({ officialName: "", displayName: "", industry: "", city: "Orai", address: "", mapsUrl: "", wrongSpellings: "", engagementType: "retainer" as Client["engagementType"], languagePref: "Hinglish" as Client["languagePref"], ownerId: "u-ram", packageId: "pkg-8", feeRupees: "25000", cycleDay: String(new Date().getDate() > 28 ? 28 : new Date().getDate()), gst: "yes", contactName: "", contactPhone: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    if (!form.officialName.trim()) return;
    const pkg = PACKAGES.find((p) => p.id === form.packageId)!;
    const c = store.addClient(
      { officialName: form.officialName.trim(), displayName: form.displayName.trim() || form.officialName.trim(), industry: form.industry, city: form.city, address: form.address || undefined, mapsUrl: form.mapsUrl || undefined, wrongSpellings: form.wrongSpellings.split(",").map((s) => s.trim()).filter(Boolean), engagementType: form.engagementType, languagePref: form.languagePref, ownerId: form.ownerId },
      form.engagementType === "one_off" ? undefined : { packageTemplateId: pkg.id, packageName: pkg.name, videosPerCycle: pkg.videosPerCycle, monthlyFeePaise: Math.round(Number(form.feeRupees) * 100), cycleDay: Number(form.cycleDay), gstApplicable: form.gst === "yes", otherDeliverables: pkg.otherDeliverables }
    );
    if (form.contactName) store.addContact({ clientId: c.id, name: form.contactName, designation: "Primary contact", phone: form.contactPhone, isPrimary: true });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New client" wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Official business name (exact spelling)"><Input value={form.officialName} onChange={set("officialName")} placeholder="e.g. Maa Sharda Jewellers" lang="hi" /></Field>
        <Field label="Display name (optional)"><Input value={form.displayName} onChange={set("displayName")} /></Field>
        <Field label="Industry"><Input value={form.industry} onChange={set("industry")} placeholder="Jewellery showroom" /></Field>
        <Field label="City"><Input value={form.city} onChange={set("city")} /></Field>
        <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
        <Field label="Google Maps link"><Input value={form.mapsUrl} onChange={set("mapsUrl")} placeholder="https://maps.google.com/…" /></Field>
        <Field label="Known wrong spellings (comma separated)" hint="The app will warn whenever someone types these."><Input value={form.wrongSpellings} onChange={set("wrongSpellings")} placeholder="Ma Sharda, Maa Sharda Jewelers" /></Field>
        <Field label="Content language"><Select value={form.languagePref} onChange={set("languagePref")}><option>Hindi</option><option>Hinglish</option><option>English</option></Select></Field>
        <Field label="Engagement"><Select value={form.engagementType} onChange={set("engagementType")}><option value="retainer">Monthly retainer</option><option value="one_off">One-off project only</option><option value="both">Both</option></Select></Field>
        <Field label="Account owner"><Select value={form.ownerId} onChange={set("ownerId")}>{store.state.team.filter((t) => t.role !== "team").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        {form.engagementType !== "one_off" && (
          <>
            <Field label="Package"><Select value={form.packageId} onChange={set("packageId")}>{PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Monthly fee (₹)"><Input type="number" value={form.feeRupees} onChange={set("feeRupees")} /></Field>
            <Field label="Billing / cycle day (1–28)"><Input type="number" min={1} max={28} value={form.cycleDay} onChange={set("cycleDay")} /></Field>
            <Field label="GST applicable"><Select value={form.gst} onChange={set("gst")}><option value="yes">Yes (18%)</option><option value="no">No</option></Select></Field>
          </>
        )}
        <Field label="Primary contact name"><Input value={form.contactName} onChange={set("contactName")} /></Field>
        <Field label="Contact phone"><Input value={form.contactPhone} onChange={set("contactPhone")} placeholder="+91 …" /></Field>
      </div>
      <p className="text-xs muted mt-4">An onboarding checklist (9 steps) is created automatically. The client stays in “Onboarding” until every step is done.</p>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!form.officialName.trim()}>Create client</Button>
      </div>
    </Modal>
  );
}

export { Textarea };
