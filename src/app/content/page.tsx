'use client';

import { useEffect, useState } from 'react';
import { loadData, saveData, touchClient, type ContentItem, type Client } from '@/lib/store';

const STAGES = ['idea', 'planned', 'shot', 'editing', 'ready', 'approved', 'scheduled', 'posted'] as const;

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ clientId: '', title: '', stage: 'idea' as const, assignee: 'Prathmes' });

  const refresh = () => {
    const data = loadData();
    setItems(data.content);
    setClients(data.clients);
  };

  useEffect(() => { refresh(); }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    data.content.unshift({
      id: Date.now().toString(),
      clientId: form.clientId,
      title: form.title,
      stage: form.stage,
      assignee: form.assignee,
      createdAt: new Date().toISOString(),
    });
    saveData(data);
    touchClient(form.clientId);
    setShow(false);
    setForm({ clientId: '', title: '', stage: 'idea', assignee: 'Prathmes' });
    refresh();
  };

  const move = (id: string, stage: ContentItem['stage']) => {
    const data = loadData();
    const item = data.content.find((x: ContentItem) => x.id === id);
    if (item) {
      item.stage = stage;
      if (stage === 'posted') {
        const c = data.clients.find((x: Client) => x.id === item.clientId);
        if (c) c.videosPosted = Math.min(c.videosPosted + 1, c.videosPromised);
      }
    }
    saveData(data);
    if (item) touchClient(item.clientId);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Pipeline</h1>
          <p className="text-sm text-muted-foreground">Idea → Shot → Edited → Posted</p>
        </div>
        <button onClick={() => setShow(!show)} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">
          {show ? 'Cancel' : '+ Content'}
        </button>
      </header>

      {show && (
        <form onSubmit={add} className="rounded-xl border p-4 space-y-3">
          <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Title / idea" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as any })} className="border rounded-lg px-3 py-2">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="bg-green text-white px-4 py-2 rounded-lg text-sm">Add</button>
        </form>
      )}

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No content items yet.</p>}
        {items.map(item => {
          const client = clients.find(c => c.id === item.clientId);
          return (
            <div key={item.id} className="rounded-xl border p-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{client?.name} · {item.assignee}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border">{item.stage}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => move(item.id, s)}
                    className={`text-xs px-2 py-1 rounded ${item.stage === s ? 'bg-foreground text-background' : 'border'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
