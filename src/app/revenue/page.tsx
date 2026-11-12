'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { useStore, inr, monthLabel, currentMonth, type Client } from '@/lib/store';
import { useRole } from '@/lib/role';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Stat, Select, EmptyState, SectionTitle, ProgressBar } from '@/components/ui';

const inMonth = (date: string | undefined, month: string) => !!date && date.slice(0, 7) === month;

export default function RevenuePage() {
  const data = useStore();
  const { isOwner } = useRole();
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());

  const months = useMemo(() => {
    const set = new Set<string>([currentMonth()]);
    for (const c of data.clients) {
      for (const p of c.payments || []) if (p.date) set.add(p.date.slice(0, 7));
      for (const e of c.expenses || []) if (e.date) set.add(e.date.slice(0, 7));
    }
    return [...set].sort().reverse();
  }, [data.clients]);

  const active = data.clients.filter(c => c.status !== 'Churned');

  const rows = active.map(c => {
    const received = (c.payments || []).filter(p => inMonth(p.date, month)).reduce((s, p) => s + p.amount, 0);
    const spent = (c.expenses || []).filter(e => inMonth(e.date, month)).reduce((s, e) => s + e.amount, 0);
    const fee = c.monthlyFee || 0;
    return { ...c, received, spent, profit: received - spent, fee, outstanding: Math.max(0, fee - received) };
  }).sort((a, b) => b.outstanding - a.outstanding || b.fee - a.fee);

  const totals = rows.reduce((s, r) => ({ fee: s.fee + r.fee, received: s.received + r.received, spent: s.spent + r.spent }), { fee: 0, received: 0, spent: 0 });
  const outstanding = Math.max(0, totals.fee - totals.received);
  const collectionPct = totals.fee > 0 ? Math.round((totals.received / totals.fee) * 100) : 0;

  const byCategory: Record<string, number> = {};
  for (const c of active) for (const e of c.expenses || []) if (inMonth(e.date, month)) byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + e.amount;
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = categories[0]?.[1] || 1;

  const unpaid = rows.filter(r => r.fee > 0 && r.received < r.fee);

  const exportCSV = () => {
    const head = ['Client', 'Package', 'Monthly Fee', 'Received', 'Outstanding', 'Spent', 'Profit'];
    const body = rows.map(r => [r.name, r.package, r.fee, r.received, r.outstanding, r.spent, r.profit].map(String));
    const csv = [head, ...body].map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orbit-ops-revenue-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded');
  };

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <EmptyState icon={<Lock className="h-5 w-5" />} title="Owner only" hint="Revenue, payments and expenses are visible to the Owner role. Switch role from the sidebar and enter the PIN if one is set." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Revenue" subtitle="Active clients, one month at a time"
        actions={
          <>
            <Select value={month} onChange={e => setMonth(e.target.value)} className="w-auto min-w-36">
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </Select>
            <Button size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Expected" value={inr(totals.fee)} hint="Sum of monthly fees" />
        <Stat label="Received" value={inr(totals.received)} tone="green" hint={`${collectionPct}% collected`} />
        <Stat label="Outstanding" value={inr(outstanding)} tone={outstanding > 0 ? 'amber' : undefined} hint={`${unpaid.length} client${unpaid.length === 1 ? '' : 's'} pending`} />
        <Stat label="Profit" value={inr(totals.received - totals.spent)} tone={totals.received - totals.spent >= 0 ? 'green' : 'red'} hint={`${inr(totals.spent)} spent`} />
      </div>

      <Card className="p-5">
        <SectionTitle right={<span className="text-xs tabular-nums text-muted-foreground">{collectionPct}%</span>}>Collection</SectionTitle>
        <ProgressBar value={totals.received} max={totals.fee || 1} tone={collectionPct >= 100 ? 'green' : collectionPct >= 50 ? 'amber' : 'red'} />
      </Card>

      <section>
        <SectionTitle>Client-wise · {monthLabel(month)}</SectionTitle>
        <Card>
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No active clients.</p>}
          {rows.map(r => <ClientRow key={r.id} r={r} />)}
        </Card>
      </section>

      {categories.length > 0 && (
        <section>
          <SectionTitle>Spend by category</SectionTitle>
          <Card className="p-5 space-y-3">
            {categories.map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{cat}</span>
                  <span className="tabular-nums text-muted-foreground">{inr(amount)}</span>
                </div>
                <ProgressBar value={amount} max={maxCat} />
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function ClientRow({ r }: { r: Client & { received: number; spent: number; profit: number; fee: number; outstanding: number } }) {
  return (
    <Link href={`/clients/${r.id}`} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.fee ? `Fee ${inr(r.fee)}` : 'No fee set'}{r.spent ? ` · spent ${inr(r.spent)}` : ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm tabular-nums text-green">{inr(r.received)}</p>
        {r.outstanding > 0
          ? <p className="text-[11px] tabular-nums text-amber">{inr(r.outstanding)} due</p>
          : r.fee > 0 && <p className="text-[11px] text-green">Paid</p>}
      </div>
    </Link>
  );
}
