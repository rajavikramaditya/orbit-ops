'use client';

import { useEffect, useState } from 'react';
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">What must we do today, and which client is falling behind?</p>
      </header>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">Open tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks. Add some from the Tasks page.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.assignee} · Due {t.due} · {t.priority}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => markDone(t.id)} className="text-xs px-3 py-1 rounded-lg bg-green text-white">Done</button>
                  <button onClick={() => snooze(t.id)} className="text-xs px-3 py-1 rounded-lg border">Snooze</button>
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
            <div key={c.id} className="rounded-xl border border-red/30 bg-red/5 p-4 mb-2">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">Last activity {Math.floor((Date.now() - new Date(c.lastActivityAt).getTime()) / 86400000)} days ago</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
