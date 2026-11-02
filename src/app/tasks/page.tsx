'use client';

import { useEffect, useState } from 'react';
import { loadData, saveData, type Task, type Client } from '@/lib/store';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', clientId: '', assignee: 'Prathmes', priority: 'P2' as const, due: '' });

  const refresh = () => {
    const data = loadData();
    setTasks(data.tasks);
    setClients(data.clients);
  };

  useEffect(() => { refresh(); }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    data.tasks.unshift({
      id: Date.now().toString(),
      title: form.title,
      clientId: form.clientId || undefined,
      assignee: form.assignee,
      priority: form.priority,
      due: form.due,
      status: 'todo',
      createdAt: new Date().toISOString(),
    });
    saveData(data);
    setShow(false);
    setForm({ title: '', clientId: '', assignee: 'Prathmes', priority: 'P2', due: '' });
    refresh();
  };

  const toggle = (id: string) => {
    const data = loadData();
    const t = data.tasks.find((x: Task) => x.id === id);
    if (t) t.status = t.status === 'done' ? 'todo' : 'done';
    saveData(data);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Everything that is not a video</p>
        </div>
        <button onClick={() => setShow(!show)} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">
          {show ? 'Cancel' : '+ Task'}
        </button>
      </header>

      {show && (
        <form onSubmit={add} className="rounded-xl border p-4 space-y-3">
          <input required placeholder="Task title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
            <option value="">No client (internal)</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Assignee" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="border rounded-lg px-3 py-2" />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="border rounded-lg px-3 py-2">
              <option value="P1">P1 Urgent</option>
              <option value="P2">P2 Normal</option>
              <option value="P3">P3 Low</option>
            </select>
            <input type="date" required value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="bg-green text-white px-4 py-2 rounded-lg text-sm">Add Task</button>
        </form>
      )}

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
        {tasks.map(t => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border p-4">
            <div className={t.status === 'done' ? 'opacity-50 line-through' : ''}>
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.assignee} · {t.due} · {t.priority}</p>
            </div>
            <button onClick={() => toggle(t.id)} className="text-sm px-3 py-1 border rounded-lg">
              {t.status === 'done' ? 'Undo' : 'Done'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
