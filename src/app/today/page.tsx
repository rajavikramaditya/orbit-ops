'use client';

import { useEffect, useState } from 'react';
import { loadData, type Client, type Task } from '@/lib/store';
import Link from 'next/link';

export default function TodayPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [openTasks, setOpenTasks] = useState(0);

  useEffect(() => {
    const data = loadData();
    setClients(data.clients.filter((c: Client) => c.status !== 'Churned'));
    setOpenTasks(data.tasks.filter((t: Task) => t.status !== 'done').length);
  }, []);

  const behind = clients.filter((c: Client) => c.status === 'Active' && c.videosPosted < c.videosPromised * 0.5);
  const atRisk = clients.filter((c: Client) => c.health === 'red');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">What must we do today, and which client is falling behind?</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-semibold tabular-nums">{openTasks}</p>
          <p className="text-xs text-muted-foreground mt-1">Open tasks</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-semibold tabular-nums">{behind.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Behind on cycle</p>
        </div>
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-3xl font-semibold tabular-nums">{atRisk.length}</p>
          <p className="text-xs text-muted-foreground mt-1">At risk</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Monthly delivery</h2>
        <div className="space-y-3">
          {clients.filter((c: Client) => c.status === 'Active').map((c: Client) => {
            const pct = Math.round((c.videosPosted / c.videosPromised) * 100);
            const lag = c.videosPosted < c.videosPromised * 0.5;
            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">{c.name}</span>
                  <span className={lag ? 'text-red-600' : 'text-muted-foreground'}>{c.videosPosted}/{c.videosPromised}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground/70" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
