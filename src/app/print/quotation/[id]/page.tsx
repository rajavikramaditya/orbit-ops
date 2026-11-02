"use client";

import { use } from "react";
import { useStore } from "@/lib/store";
import { amountInWordsINR, formatDateDDMMYYYY, formatPaiseToINR } from "@/lib/business-rules";
import { Button } from "@/components/ui";

export default function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  if (!store.hydrated) return null;
  if (!store.can("view_money")) return <div className="p-10 text-center">You do not have permission to view quotations.</div>;
  const q = store.state.quotations.find((i) => i.id === id);
  if (!q) return <div className="p-10 text-center">Quotation not found.</div>;
  const s = store.state.settings;

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="no-print flex justify-end gap-2 p-4 max-w-[800px] mx-auto">
        <Button variant="ghost" onClick={() => window.close()}>Close</Button>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <div className="print-page max-w-[800px] mx-auto p-10" style={{ fontFamily: "Inter, 'Noto Sans Devanagari', sans-serif" }}>
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
            <p className="text-2xl font-semibold tracking-tight">QUOTATION</p>
            <p className="text-sm font-medium mt-1">{q.quotationNumber}</p>
            <p className="text-xs text-neutral-600">Date: {formatDateDDMMYYYY(q.issueDate)}</p>
            <p className="text-xs text-neutral-600">Valid until: {formatDateDDMMYYYY(q.validUntil)}</p>
          </div>
        </header>
        <section className="py-6 text-sm">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Prepared for</p>
          <p className="font-semibold" lang="hi">{q.recipientName}</p>
        </section>
        <table className="w-full text-sm border-t border-b border-black">
          <thead><tr className="text-left text-[10px] uppercase tracking-widest text-neutral-500"><th className="py-2">#</th><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={it.id} className="border-t border-neutral-200"><td className="py-2.5">{i + 1}</td><td className="py-2.5" lang="hi">{it.description}</td><td className="py-2.5 text-right tabular-nums">{it.quantity}</td><td className="py-2.5 text-right tabular-nums">{formatPaiseToINR(it.unitPricePaise)}</td><td className="py-2.5 text-right tabular-nums">{formatPaiseToINR(it.lineTotalPaise)}</td></tr>
            ))}
          </tbody>
        </table>
        <section className="grid grid-cols-2 gap-8 pt-4 text-sm">
          <div><p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Amount in words</p><p className="font-medium">{amountInWordsINR(q.totalPaise)}</p></div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span className="tabular-nums">{formatPaiseToINR(q.subtotalPaise)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-600">GST @ {q.gstApplicable ? q.gstRatePercent : 0}%</span><span className="tabular-nums">{formatPaiseToINR(q.gstAmountPaise)}</span></div>
            <div className="flex justify-between border-t-2 border-black pt-2 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatPaiseToINR(q.totalPaise)}</span></div>
          </div>
        </section>
        <section className="pt-10 text-xs"><p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Terms</p><p className="whitespace-pre-wrap text-neutral-700">{s.invoiceTerms}</p>{q.notes && <p className="mt-2">{q.notes}</p>}</section>
        <footer className="flex justify-between items-end pt-16 text-xs"><p className="text-neutral-500">We look forward to growing with you.</p><div className="text-center"><div className="h-12 w-44 border-b border-black mb-1" /><p>Authorised signatory · {s.legalName}</p></div></footer>
      </div>
    </div>
  );
}
