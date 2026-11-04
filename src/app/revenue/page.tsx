'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadData, type Client } from '@/lib/store';

export default function RevenuePage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    setClients(loadData().clients);
  }, []);

  const active = clients.filter(c => c.status !== 'Churned');
  const totalReceived = active.reduce((s, c) => s + (c.payments || []).reduce((a, p) => a + p.amount, 0), 0);
  const totalSpent = active.reduce((s, c) => s + (c.expenses || []).reduce((a, e) => a + e.amount, 0), 0);
  const profit = totalReceived - totalSpent;

  const rows = active.map(c => {
    const received = (c.payments || []).reduce((a, p) => a + p.amount, 0);
    const spent = (c.expenses || []).reduce((a, e) => a + e.amount, 0);
    return { ...c, received, spent, profit: received - spent };
  }).sort((a, b) => b.received - a.received);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
        <p className="text-sm text-muted-foreground">Active clients only</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="text-xl font-semibold text-green-700 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-xl font-semibold text-red-700 mt-1">₹{totalSpent.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Profit</p>
          <p className={`text-xl font-semibold mt-1 ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{profit.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <section className="rounded-lg border">
        <div className="px-4 py-3 border-b text-sm font-medium">Client-wise</div>
        <div className="divide-y">
          {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">No data yet.</p>}
          {rows.map(c => (
            <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.package}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-green-700">₹{c.received.toLocaleString('en-IN')}</p>
                <p className="text-red-700 text-xs">Spent ₹{c.spent.toLocaleString('en-IN')}</p>
                <p className={`text-xs ${c.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Profit ₹{c.profit.toLocaleString('en-IN')}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
