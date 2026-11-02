"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, DateText, EmptyState, Field, Input, Modal, Pill, Select, Stat, Textarea } from "@/components/ui";
import { amountInWordsINR, calculateInvoiceTotalsPaise, formatPaiseToINR } from "@/lib/business-rules";
import { Invoice, PaymentRecord } from "@/lib/types";

export function invoicePaid(store: ReturnType<typeof useStore>, inv: Invoice) {
  return store.state.payments.filter((p) => p.invoiceId === inv.id && !p.deletedAt).reduce((a, p) => a + p.amountPaise, 0);
}

export function invoiceStatus(store: ReturnType<typeof useStore>, inv: Invoice): { label: string; tone: "green" | "amber" | "red" | "neutral" } {
  const paid = invoicePaid(store, inv);
  if (paid >= inv.totalPaise) return { label: "Paid", tone: "green" };
  if (inv.dueDate < store.today) return { label: "Overdue", tone: "red" };
  if (paid > 0) return { label: "Partially paid", tone: "amber" };
  return { label: "Issued", tone: "neutral" };
}

export function MoneyClientPanel({ clientId }: { clientId: string }) {
  const store = useStore();
  const client = store.state.clients.find((c) => c.id === clientId)!;
  const plan = store.state.plans.find((p) => p.clientId === clientId && p.active);
  const invoices = store.state.invoices.filter((i) => i.clientId === clientId && !i.deletedAt).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const payments = store.state.payments.filter((p) => p.clientId === clientId && !p.deletedAt).sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  const projects = store.state.projects.filter((p) => p.clientId === clientId && !p.deletedAt);
  const [newInvoice, setNewInvoice] = useState(false);
  const [newPayment, setNewPayment] = useState(false);

  const totalInvoiced = invoices.reduce((a, i) => a + i.totalPaise, 0);
  const totalReceived = payments.reduce((a, p) => a + p.amountPaise, 0);
  const balance = invoices.reduce((a, i) => a + Math.max(0, i.totalPaise - invoicePaid(store, i)), 0) + projects.reduce((a, p) => a + Math.max(0, p.pricePaise - payments.filter((x) => x.projectId === p.id).reduce((s, x) => s + x.amountPaise, 0)), 0);

  // Next renewal = next cycle day
  let renewal = "";
  if (plan) {
    const t = new Date(store.today);
    const d = new Date(t.getFullYear(), t.getMonth(), plan.cycleDay);
    if (d <= t) d.setMonth(d.getMonth() + 1);
    renewal = d.toISOString().slice(0, 10);
  }
  const renewalDays = renewal ? Math.round((new Date(renewal).getTime() - new Date(store.today).getTime()) / 86400000) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Monthly fee" value={plan ? formatPaiseToINR(plan.monthlyFeePaise) : "—"} hint={plan ? `Billing day ${plan.cycleDay} · ${plan.gstApplicable ? "GST 18%" : "No GST"}` : "One-off only"} />
        <Stat label="Invoiced" value={formatPaiseToINR(totalInvoiced)} hint={`${invoices.length} invoices`} />
        <Stat label="Received" value={formatPaiseToINR(totalReceived)} hint={`${payments.length} payments`} tone="green" />
        <Stat label="Balance due" value={formatPaiseToINR(balance)} hint={renewal ? `Renewal in ${renewalDays}d (${renewal.split("-").reverse().join("/")})` : undefined} tone={balance > 0 ? (invoices.some((i) => invoiceStatus(store, i).tone === "red") ? "red" : "amber") : "green"} />
      </div>
      {renewalDays !== null && renewalDays <= 7 && <p className="text-xs rounded-lg px-3 py-2 pill-amber border">Renewal reminder: {client.displayName}&apos;s cycle renews in {renewalDays} day{renewalDays === 1 ? "" : "s"}. Raise the next invoice.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Invoices" action={store.can("manage_money") && <Button size="sm" onClick={() => setNewInvoice(true)}><Plus size={14} /> Invoice</Button>} padded={false}>
          <ul className="divide-y">
            {invoices.map((inv) => {
              const st = invoiceStatus(store, inv);
              const paid = invoicePaid(store, inv);
              return (
                <li key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{inv.invoiceNumber} <Pill tone={st.tone}>{st.label}</Pill></p>
                    <p className="text-xs muted">Issued <DateText value={inv.issueDate} /> · due <DateText value={inv.dueDate} /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatPaiseToINR(inv.totalPaise)}</p>
                    {paid > 0 && paid < inv.totalPaise && <p className="text-xs muted tabular-nums">paid {formatPaiseToINR(paid)} · bal {formatPaiseToINR(inv.totalPaise - paid)}</p>}
                    <Link href={`/print/invoice/${inv.id}`} target="_blank" className="text-xs underline inline-flex items-center gap-1 mt-0.5"><Printer size={11} /> PDF</Link>
                  </div>
                </li>
              );
            })}
            {invoices.length === 0 && <li><EmptyState title="No invoices" /></li>}
          </ul>
        </Card>
        <Card title="Payments received" action={store.can("manage_money") && <Button size="sm" variant="ghost" onClick={() => setNewPayment(true)}><Plus size={14} /> Payment</Button>} padded={false}>
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{formatPaiseToINR(p.amountPaise)} <span className="muted text-xs">· {p.method}</span></p>
                  <p className="text-xs muted"><DateText value={p.paidOn} /> {p.referenceNo && `· ref ${p.referenceNo}`} {p.invoiceId && `· ${store.state.invoices.find((i) => i.id === p.invoiceId)?.invoiceNumber}`} {p.projectId && `· ${store.state.projects.find((i) => i.id === p.projectId)?.name}`}</p>
                </div>
              </li>
            ))}
            {payments.length === 0 && <li><EmptyState title="No payments yet" /></li>}
          </ul>
        </Card>
      </div>

      <NewInvoiceModal open={newInvoice} onClose={() => setNewInvoice(false)} clientId={clientId} />
      <NewPaymentModal open={newPayment} onClose={() => setNewPayment(false)} clientId={clientId} />
    </div>
  );
}

export function NewInvoiceModal({ open, onClose, clientId: initialClient }: { open: boolean; onClose: () => void; clientId?: string }) {
  const store = useStore();
  const [clientId, setClientId] = useState(initialClient ?? store.state.clients[0]?.id ?? "");
  const client = store.state.clients.find((c) => c.id === clientId);
  const plan = store.state.plans.find((p) => p.clientId === clientId && p.active);
  const [items, setItems] = useState([{ description: plan ? `Monthly retainer – ${plan.packageName}` : "Service", quantity: 1, rupees: plan ? plan.monthlyFeePaise / 100 : 0 }]);
  const [gst, setGst] = useState(plan?.gstApplicable ?? true);
  const [due, setDue] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState("");

  const totals = calculateInvoiceTotalsPaise(items.map((i) => ({ quantity: i.quantity, unitPricePaise: Math.round(i.rupees * 100) })), gst, store.state.settings.defaultGstRate);

  const onClientChange = (id: string) => {
    setClientId(id);
    const p = store.state.plans.find((x) => x.clientId === id && x.active);
    setItems([{ description: p ? `Monthly retainer – ${p.packageName}` : "Service", quantity: 1, rupees: p ? p.monthlyFeePaise / 100 : 0 }]);
    setGst(p?.gstApplicable ?? true);
  };

  const submit = () => {
    const inv = store.createInvoice({ clientId, projectId: projectId || undefined, items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPricePaise: Math.round(i.rupees * 100) })), gstApplicable: gst, dueDate: due, notes: notes || undefined });
    onClose();
    window.open(`/print/invoice/${inv.id}`, "_blank");
  };

  return (
    <Modal open={open} onClose={onClose} title={`New invoice · ${store.state.settings.invoicePrefix}-${new Date().getFullYear()}-${String(store.state.settings.nextInvoiceSeq).padStart(3, "0")}`} wide>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Client"><Select value={clientId} onChange={(e) => onClientChange(e.target.value)}>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.officialName}</option>)}</Select></Field>
          <Field label="Linked project (optional)"><Select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">—</option>{store.state.projects.filter((p) => p.clientId === clientId && !p.deletedAt).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
          <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <div>
          <p className="label">Line items</p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input className="col-span-7" value={it.description} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} lang="hi" />
                <Input className="col-span-2" type="number" min={1} value={it.quantity} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))} />
                <Input className="col-span-3" type="number" step="0.01" value={it.rupees} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, rupees: Number(e.target.value) } : x)))} />
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setItems([...items, { description: "", quantity: 1, rupees: 0 }])}>+ Line</Button>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gst} onChange={(e) => setGst(e.target.checked)} className="h-4 w-4" /> Apply GST @ {store.state.settings.defaultGstRate}% {client?.gstNo ? `(client GSTIN ${client.gstNo})` : ""}</label>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[60px]" /></Field>
        <div className="rounded-xl soft p-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="muted">Subtotal</span><span className="tabular-nums">{formatPaiseToINR(totals.subtotalPaise)}</span></div>
          <div className="flex justify-between"><span className="muted">GST</span><span className="tabular-nums">{formatPaiseToINR(totals.gstAmountPaise)}</span></div>
          <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Total</span><span className="tabular-nums">{formatPaiseToINR(totals.totalPaise)}</span></div>
          <p className="text-xs muted">{amountInWordsINR(totals.totalPaise)}</p>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!clientId || totals.totalPaise <= 0}>Issue invoice</Button></div>
      </div>
    </Modal>
  );
}

export function NewPaymentModal({ open, onClose, clientId: initialClient }: { open: boolean; onClose: () => void; clientId?: string }) {
  const store = useStore();
  const [clientId, setClientId] = useState(initialClient ?? store.state.clients[0]?.id ?? "");
  const [invoiceId, setInvoiceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [rupees, setRupees] = useState("");
  const [method, setMethod] = useState<PaymentRecord["method"]>("UPI");
  const [ref, setRef] = useState("");
  const [paidOn, setPaidOn] = useState(store.today);
  const openInvoices = store.state.invoices.filter((i) => i.clientId === clientId && !i.deletedAt && invoicePaid(store, i) < i.totalPaise);
  const openProjects = store.state.projects.filter((p) => p.clientId === clientId && !p.deletedAt && p.status !== "paid");
  const selected = store.state.invoices.find((i) => i.id === invoiceId);

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <div className="space-y-3">
        <Field label="Client"><Select value={clientId} onChange={(e) => { setClientId(e.target.value); setInvoiceId(""); setProjectId(""); }}>{store.state.clients.filter((c) => !c.deletedAt).map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}</Select></Field>
        <Field label="Against invoice"><Select value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); const inv = store.state.invoices.find((i) => i.id === e.target.value); if (inv) setRupees(String((inv.totalPaise - invoicePaid(store, inv)) / 100)); }}><option value="">— none / advance —</option>{openInvoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · balance {formatPaiseToINR(i.totalPaise - invoicePaid(store, i))}</option>)}</Select></Field>
        <Field label="Against project"><Select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">—</option>{openProjects.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatPaiseToINR(p.pricePaise)}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹, paise allowed)"><Input type="number" step="0.01" value={rupees} onChange={(e) => setRupees(e.target.value)} /></Field>
          <Field label="Paid on"><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
          <Field label="Method"><Select value={method} onChange={(e) => setMethod(e.target.value as PaymentRecord["method"])}><option>UPI</option><option>Bank Transfer (NEFT/IMPS)</option><option>Cash</option><option>Cheque</option></Select></Field>
          <Field label="Reference no."><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>
        {selected && Number(rupees) * 100 < selected.totalPaise - invoicePaid(store, selected) && <p className="text-xs muted">Partial payment · remaining balance will be {formatPaiseToINR(selected.totalPaise - invoicePaid(store, selected) - Math.round(Number(rupees) * 100))}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!rupees || Number(rupees) <= 0} onClick={() => { store.recordPayment({ clientId, invoiceId: invoiceId || undefined, projectId: projectId || undefined, amountPaise: Math.round(Number(rupees) * 100), paidOn, method, referenceNo: ref || undefined }); onClose(); }}>Save payment</Button></div>
      </div>
    </Modal>
  );
}
