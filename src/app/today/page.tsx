'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, type Task, type Client } from '@/lib/store';

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const refresh = () => {
    const data = loadData();
    setTasks(data.tasks.filter((t: Task) => t.status !== 'done'));
    setClients(data.clients);
  };

  useEffect(() => { refresh(); }, []);

  const markDone = (id: string) => {
    const data = loadData();
    const t = data.tasks.find((x: Task) => x.id === id);
    if (t) t.status = 'done';
    saveData(data);
    refresh();
  };

  const snooze = (id: string) => {
    const data = loadData();
    const t = data.tasks.find((x: Task) => x.id === id);
    if (t) {
      const d = new Date(t.due);
      d.setDate(d.getDate() + 1);
      t.due = d.toISOString().slice(0, 10);
    }
    saveData(data);
    refresh();
  };

  const coldClients = clients.filter(c => {
    const days = (Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000;
    return days >= 7;
  });

  const behindClients = clients.filter(c => c.videosPosted < c.videosPromised * 0.5 && c.status === 'Active');
  const redClients = clients.filter(c => c.health === 'red');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">What must we do today, and which client is falling behind?</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{tasks.length}</p>
          <p className="text-xs text-muted-foreground">Open tasks</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{behindClients.length}</p>
          <p className="text-xs text-muted-foreground">Behind</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{redClients.length}</p>
          <p className="text-xs text-muted-foreground">At risk</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Priority tasks</h2>
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No open tasks.</p>
            <Link href="/tasks" className="text-sm text-foreground underline mt-2 inline-block">Add a task →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 break-words">
                    {t.assignee} · Due {t.due} · {t.priority}
                  </p>
                </div>
                <div className="flex gap-2 sm:flex-col sm:gap-1 shrink-0">
                  <button onClick={() => markDone(t.id)} className="flex-1 sm:flex-none text-sm px-4 py-2 rounded-lg bg-foreground text-background font-medium">Done</button>
                  <button onClick={() => snooze(t.id)} className="flex-1 sm:flex-none text-sm px-4 py-2 rounded-lg border">Snooze</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {coldClients.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Clients going cold</h2>
          {coldClients.map(c => (
            <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-lg border p-4 mb-2">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">Last activity {Math.floor((Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000)} days ago</p>
            </Link>
          ))}
        </section>
      )}

      {behindClients.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Behind schedule</h2>
          {behindClients.map(c => (
            <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-lg border p-4 mb-2">
              <div className="flex justify-between">
                <p className="font-medium">{c.name}</p>
                <span className="text-xs text-muted-foreground">{c.videosPosted}/{c.videosPromised}</span>
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-foreground/70" style={{ width: `${(c.videosPosted / c.videosPromised) * 100}%` }} />
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
