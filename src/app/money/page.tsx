"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Card, DateText, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Stat, Tabs, Textarea } from "@/components/ui";
import { amountInWordsINR, calculateInvoiceTotalsPaise, formatPaiseToINR } from "@/lib/business-rules";
import { Forbidden } from "@/components/Forbidden";
import { NewInvoiceModal, NewPaymentModal, invoicePaid, invoiceStatus } from "@/components/MoneyClientPanel";

type Tab = "overview" | "invoices" | "quotations" | "payments";

export default function MoneyPage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [newInv, setNewInv] = useState(false);
  const [newPay, setNewPay] = useState(false);
  const [newQuote, setNewQuote] = useState(false);

  const data = useMemo(() => {
    const invoices = store.state.invoices.filter((i) => !i.deletedAt);
    const payments = store.state.payments.filter((p) => !p.deletedAt);
    const plans = store.state.plans.filter((p) => p.active && store.state.clients.find((c) => c.id === p.clientId && !c.deletedAt && c.status === "active"));
    const mrr = plans.reduce((a, p) => a + p.monthlyFeePaise, 0);
    const pending = invoices.reduce((a, i) => a + Math.max(0, i.totalPaise - invoicePaid(store, i)), 0);
    const overdue = invoices.filter((i) => invoiceStatus(store, i).tone === "red");
    const thisMonth = store.today.slice(0, 7);
    const collectedThisMonth = payments.filter((p) => p.paidOn.startsWith(thisMonth)).reduce((a, p) => a + p.amountPaise, 0);
    const invoicedThisMonth = invoices.filter((i) => i.issueDate.startsWith(thisMonth)).reduce((a, i) => a + i.totalPaise, 0);
    // month-wise series (last 6 months)
    const months: { key: string; invoiced: number; collected: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(store.today); d.setDate(1); d.setMonth(d.getMonth() - k);
      const key = d.toISOString().slice(0, 7);
      months.push({ key, invoiced: invoices.filter((i) => i.issueDate.startsWith(key)).reduce((a, i) => a + i.totalPaise, 0), collected: payments.filter((p) => p.paidOn.startsWith(key)).reduce((a, p) => a + p.amountPaise, 0) });
    }
    // renewals in 7 days
    const renewals = plans.map((p) => { const t = new Date(store.today); const d = new Date(t.getFullYear(), t.getMonth(), p.cycleDay); if (d <= t) d.setMonth(d.getMonth() + 1); const days = Math.round((d.getTime() - t.getTime()) / 86400000); return { p, days, date: d.toISOString().slice(0, 10) }; }).filter((r) => r.days <= 7).sort((a, b) => a.days - b.days);
    return { invoices, payments, mrr, pending, overdue, collectedThisMonth, invoicedThisMonth, months, renewals };
  }, [store]);

  if (!store.can("view_money")) return <Forbidden what="Money (Owners and Manager only)" />;
  const cname = (id?: string) => store.state.clients.find((c) => c.id === id)?.officialName ?? "—";
  const isOwner = store.can("manage_money_settings");

  return (
    <div>
      <PageHeader title="Money" subtitle={isOwner ? "Invoices, quotations, payments and renewals. All amounts stored in paise — never rounded." : "Limited Manager view · record payments and raise invoices"} actions={<>
        <Button variant="ghost" onClick={() => setNewQuote(true)}><Plus size={16} /> Quotation</Button>
        <Button variant="ghost" onClick={() => setNewPay(true)}><Plus size={16} /> Payment</Button>
        <Button onClick={() => setNewInv(true)}><Plus size={16} /> Invoice</Button>
      </>} />

      <div className="grid gap-3 sm:grid-cols-4 mb-5">
        <Stat label="Monthly retainers (MRR)" value={formatPaiseToINR(data.mrr)} hint="active clients, ex-GST" />
        <Stat label="Collected this month" value={formatPaiseToINR(data.collectedThisMonth)} tone="green" hint={`invoiced ${formatPaiseToINR(data.invoicedThisMonth)}`} />
        <Stat label="Pending" value={formatPaiseToINR(data.pending)} tone={data.pending > 0 ? "amber" : undefined} hint="unpaid balance across invoices" />
        <Stat label="Overdue invoices" value={data.overdue.length} tone={data.overdue.length ? "red" : "green"} hint={data.overdue.length ? formatPaiseToINR(data.overdue.reduce((a, i) => a + i.totalPaise - invoicePaid(store, i), 0)) : "none"} />
      </div>

      {data.renewals.length > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 pill-amber border text-sm">
          <p className="font-semibold mb-1">Renewals in the next 7 days</p>
          <ul className="text-xs space-y-0.5">{data.renewals.map((r) => <li key={r.p.id}>{cname(r.p.clientId)} · <DateText value={r.date} /> · {formatPaiseToINR(r.p.monthlyFeePaise)} — raise invoice</li>)}</ul>
        </div>
      )}

      <Tabs tabs={[{ id: "overview", label: "Month-wise" }, { id: "invoices", label: "Invoices", count: data.invoices.length }, { id: "quotations", label: "Quotations", count: store.state.quotations.filter((q) => !q.deletedAt).length }, { id: "payments", label: "Payments", count: data.payments.length }]} value={tab} onChange={setTab} />

      {tab === "overview" && (
        <Card title="Revenue · invoiced vs collected (last 6 months)" padded={false}>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide muted text-left"><tr className="border-b"><th className="px-4 py-2.5">Month</th><th className="px-4 py-2.5 text-right">Invoiced</th><th className="px-4 py-2.5 text-right">Collected</th><th className="px-4 py-2.5 text-right">Pending</th></tr></thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.key} className="border-b"><td className="px-4 py-2.5 font-medium">{new Date(m.key + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatPaiseToINR(m.invoiced)}</td><td className="px-4 py-2.5 text-right tabular-nums text-[#16a34a]">{formatPaiseToINR(m.collected)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatPaiseToINR(Math.max(0, m.invoiced - m.collected))}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "invoices" && (
        <Card padded={false}>
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-xs uppercase tracking-wide muted text-left"><tr className="border-b"><th className="px-4 py-2.5">Number</th><th className="px-4 py-2.5">Client</th><th className="px-4 py-2.5">Issued</th><th className="px-4 py-2.5">Due</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-right">Balance</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr></thead>
              <tbody>
                {data.invoices.sort((a, b) => b.invoiceNumber.localeCompare(a.invoiceNumber)).map((i) => { const st = invoiceStatus(store, i); const bal = i.totalPaise - invoicePaid(store, i); return (
                  <tr key={i.id} className="border-b row-hover"><td className="px-4 py-2.5 font-medium">{i.invoiceNumber}</td><td className="px-4 py-2.5"><Link href={`/clients/${i.clientId}?tab=money`} className="hover:underline">{cname(i.clientId)}</Link></td><td className="px-4 py-2.5"><DateText value={i.issueDate} /></td><td className="px-4 py-2.5"><DateText value={i.dueDate} /></td><td className="px-4 py-2.5 text-right tabular-nums">{formatPaiseToINR(i.totalPaise)}</td><td className="px-4 py-2.5 text-right tabular-nums">{formatPaiseToINR(bal)}</td><td className="px-4 py-2.5"><Pill tone={st.tone}>{st.label}</Pill></td><td className="px-4 py-2.5 text-right"><Link href={`/print/invoice/${i.id}`} target="_blank" className="btn btn-ghost btn-sm"><Printer size={13} /> PDF</Link></td></tr>
                ); })}
                {data.invoices.length === 0 && <tr><td colSpan={8}><EmptyState title="No invoices" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "quotations" && (
        <Card padded={false}>
          <ul className="divide-y">
            {store.state.quotations.filter((q) => !q.deletedAt).map((q) => (
              <li key={q.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold">{q.quotationNumber} <Pill tone={q.status === "accepted" ? "green" : q.status === "declined" ? "red" : "neutral"}>{q.status}</Pill></p><p className="text-xs muted">{q.recipientName} · issued <DateText value={q.issueDate} /> · valid until <DateText value={q.validUntil} /></p></div>
                <div className="text-right"><p className="font-semibold tabular-nums">{formatPaiseToINR(q.totalPaise)}</p><Link href={`/print/quotation/${q.id}`} target="_blank" className="text-xs underline inline-flex items-center gap-1"><Printer size={11} /> PDF</Link></div>
              </li>
            ))}
            {store.state.quotations.filter((q) => !q.deletedAt).length === 0 && <li><EmptyState title="No quotations" /></li>}
          </ul>
        </Card>
      )}

      {tab === "payments" && (
        <Card padded={false}>
          <ul className="divide-y">
            {data.payments.sort((a, b) => b.paidOn.localeCompare(a.paidOn)).map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div><p className="text-sm font-medium">{cname(p.clientId)} · <span className="tabular-nums">{formatPaiseToINR(p.amountPaise)}</span></p><p className="text-xs muted"><DateText value={p.paidOn} /> · {p.method}{p.referenceNo ? ` · ${p.referenceNo}` : ""}{p.invoiceId ? ` · ${store.state.invoices.find((i) => i.id === p.invoiceId)?.invoiceNumber}` : ""}{p.projectId ? ` · ${store.state.projects.find((i) => i.id === p.projectId)?.name}` : ""}</p></div>
              </li>
            ))}
            {data.payments.length === 0 && <li><EmptyState title="No payments" /></li>}
          </ul>
        </Card>
      )}

      <NewInvoiceModal open={newInv} onClose={() => setNewInv(false)} />
      <NewPaymentModal open={newPay} onClose={() => setNewPay(false)} />
      <NewQuotationModal open={newQuote} onClose={() => setNewQuote(false)} />
    </div>
  );
}

function NewQuotationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [recipient, setRecipient] = useState("");
  const [leadId, setLeadId] = useState("");
  const [items, setItems] = useState([{ description: "12 videos / month retainer", quantity: 1, rupees: 35000 }]);
  const [gst, setGst] = useState(true);
  const [valid, setValid] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); });
  const [notes, setNotes] = useState("");
  const totals = calculateInvoiceTotalsPaise(items.map((i) => ({ quantity: i.quantity, unitPricePaise: Math.round(i.rupees * 100) })), gst, store.state.settings.defaultGstRate);
  return (
    <Modal open={open} onClose={onClose} title={`New quotation · ${store.state.settings.quotationPrefix}-${new Date().getFullYear()}-${String(store.state.settings.nextQuotationSeq).padStart(3, "0")}`} wide>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Recipient"><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} lang="hi" /></Field>
          {store.can("view_sales") && <Field label="Link to lead"><Select value={leadId} onChange={(e) => { setLeadId(e.target.value); const l = store.state.leads.find((x) => x.id === e.target.value); if (l) setRecipient(l.businessName); }}><option value="">—</option>{store.state.leads.filter((l) => !l.deletedAt).map((l) => <option key={l.id} value={l.id}>{l.businessName}</option>)}</Select></Field>}
          <Field label="Valid until"><Input type="date" value={valid} onChange={(e) => setValid(e.target.value)} /></Field>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <Input className="col-span-7" value={it.description} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} lang="hi" />
            <Input className="col-span-2" type="number" value={it.quantity} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))} />
            <Input className="col-span-3" type="number" step="0.01" value={it.rupees} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, rupees: Number(e.target.value) } : x)))} />
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", quantity: 1, rupees: 0 }])}>+ Line</Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={gst} onChange={(e) => setGst(e.target.checked)} /> GST @ {store.state.settings.defaultGstRate}%</label>
        <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[56px]" /></Field>
        <div className="rounded-xl soft p-4 text-sm"><div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatPaiseToINR(totals.totalPaise)}</span></div><p className="text-xs muted">{amountInWordsINR(totals.totalPaise)}</p></div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!recipient || totals.totalPaise <= 0} onClick={() => { const q = store.createQuotation({ recipientName: recipient, leadId: leadId || undefined, items: items.map((i) => ({ description: i.description, quantity: i.quantity, unitPricePaise: Math.round(i.rupees * 100) })), gstApplicable: gst, validUntil: valid, notes: notes || undefined }); onClose(); window.open(`/print/quotation/${q.id}`, "_blank"); }}>Create quotation</Button></div>
      </div>
    </Modal>
  );
}
