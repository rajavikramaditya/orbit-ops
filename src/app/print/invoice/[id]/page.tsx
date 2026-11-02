"use client";

import { use } from "react";
import { useStore } from "@/lib/store";
import { amountInWordsINR, formatDateDDMMYYYY, formatPaiseToINR } from "@/lib/business-rules";
import { Button } from "@/components/ui";

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  if (!store.hydrated) return null;
  if (!store.can("view_money")) return <div className="p-10 text-center">You do not have permission to view invoices.</div>;
  const inv = store.state.invoices.find((i) => i.id === id);
  if (!inv) return <div className="p-10 text-center">Invoice not found.</div>;
  const client = store.state.clients.find((c) => c.id === inv.clientId)!;
  const s = store.state.settings;
  const paid = store.state.payments.filter((p) => p.invoiceId === inv.id && !p.deletedAt).reduce((a, p) => a + p.amountPaise, 0);
  const balance = inv.totalPaise - paid;
  const contact = store.state.contacts.find((c) => c.clientId === client.id && c.isPrimary);

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="no-print flex justify-end gap-2 p-4 max-w-[800px] mx-auto">
        <Button variant="ghost" onClick={() => window.close()}>Close</Button>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <div className="print-page max-w-[800px] mx-auto p-10 font-sans" style={{ fontFamily: "Inter, 'Noto Sans Devanagari', sans-serif" }}>
        <header className="flex justify-between items-start border-b-2 border-black pb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-black text-white rounded-lg flex items-center justify-center font-bold">OM</div>
            <div>
              <p className="text-xl font-semibold tracking-tight">{s.headerText}</p>
              <p className="text-xs text-neutral-600">{s.registeredAddress}</p>
              <p className="text-xs text-neutral-600">GSTIN: {s.gstNumber} · {s.website}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tracking-tight">TAX INVOICE</p>
            <p className="text-sm font-medium mt-1">{inv.invoiceNumber}</p>
            <p className="text-xs text-neutral-600">Date: {formatDateDDMMYYYY(inv.issueDate)}</p>
            <p className="text-xs text-neutral-600">Due: {formatDateDDMMYYYY(inv.dueDate)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 py-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Billed to</p>
            <p className="font-semibold" lang="hi">{client.officialName}</p>
            {contact && <p>{contact.name} · {contact.phone}</p>}
            {client.address && <p>{client.address}, {client.city}</p>}
            {client.gstNo && <p>GSTIN: {client.gstNo}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Place of supply</p>
            <p>{s.state}, India</p>
          </div>
        </section>

        <table className="w-full text-sm border-t border-b border-black">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-neutral-500">
              <th className="py-2">#</th>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={it.id} className="border-t border-neutral-200">
                <td className="py-2.5 align-top">{i + 1}</td>
                <td className="py-2.5 align-top" lang="hi">{it.description}</td>
                <td className="py-2.5 text-right tabular-nums">{it.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{formatPaiseToINR(it.unitPricePaise)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatPaiseToINR(it.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="grid grid-cols-2 gap-8 pt-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Amount in words</p>
            <p className="font-medium">{amountInWordsINR(inv.totalPaise)}</p>
            {paid > 0 && (
              <div className="mt-4 text-xs text-neutral-700">
                <p>Received: {formatPaiseToINR(paid)}</p>
                <p className="font-semibold">Balance due: {formatPaiseToINR(balance)}</p>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span className="tabular-nums">{formatPaiseToINR(inv.subtotalPaise)}</span></div>
            {inv.gstApplicable ? (
              <>
                <div className="flex justify-between"><span className="text-neutral-600">CGST @ {inv.gstRatePercent / 2}%</span><span className="tabular-nums">{formatPaiseToINR(Math.floor(inv.gstAmountPaise / 2))}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">SGST @ {inv.gstRatePercent / 2}%</span><span className="tabular-nums">{formatPaiseToINR(inv.gstAmountPaise - Math.floor(inv.gstAmountPaise / 2))}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-neutral-600">GST</span><span>Not applicable</span></div>
            )}
            <div className="flex justify-between border-t-2 border-black pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatPaiseToINR(inv.totalPaise)}</span></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-8 pt-10 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Bank details</p>
            <p>{s.bankAccountName}</p>
            <p>{s.bankName}</p>
            <p>A/C: {s.bankAccountNumber} · IFSC: {s.bankIfsc}</p>
            <p>UPI: {s.bankUpiId}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Terms</p>
            <p className="whitespace-pre-wrap text-neutral-700">{s.invoiceTerms}</p>
            {inv.notes && <p className="mt-2 text-neutral-700">{inv.notes}</p>}
          </div>
        </section>

        <footer className="flex justify-between items-end pt-16 text-xs">
          <p className="text-neutral-500">Thank you for working with {s.brandName}.</p>
          <div className="text-center">
            <div className="h-12 w-44 border-b border-black mb-1" />
            <p>Authorised signatory · {s.legalName}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
