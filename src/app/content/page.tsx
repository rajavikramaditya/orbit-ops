'use client';

import { useEffect, useState } from 'react';
import { loadData, saveData, touchClient, type ContentItem, type Client } from '@/lib/store';

const STAGES = ['idea', 'planned', 'shot', 'editing', 'ready', 'approved', 'scheduled', 'posted'] as const;

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState({ clientId: '', title: '', stage: 'idea' as const, assignee: 'Prathmes', due: '' });

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
      due: form.due || undefined,
      createdAt: new Date().toISOString(),
    });
    saveData(data);
    touchClient(form.clientId);
    setShow(false);
    setForm({ clientId: '', title: '', stage: 'idea', assignee: 'Prathmes', due: '' });
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const itemsByDate: Record<string, ContentItem[]> = {};
  items.forEach(item => {
    const dateKey = item.due || item.createdAt.slice(0, 10);
    if (!itemsByDate[dateKey]) itemsByDate[dateKey] = [];
    itemsByDate[dateKey].push(item);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Content Pipeline</h1>
          <p className="text-sm text-muted-foreground">Idea → Shot → Edited → Posted</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-foreground text-background' : ''}`}>List</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm ${view === 'calendar' ? 'bg-foreground text-background' : ''}`}>Calendar</button>
          </div>
          <button onClick={() => setShow(!show)} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">
            {show ? 'Cancel' : '+ Content'}
          </button>
        </div>
      </header>

      {show && (
        <form onSubmit={add} className="rounded-xl border p-4 space-y-3">
          <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input required placeholder="Title / idea" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as any })} className="border rounded-lg px-3 py-2">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="bg-green text-white px-4 py-2 rounded-lg text-sm">Add</button>
        </form>
      )}

      {view === 'list' ? (
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No content items yet.</p>}
          {items.map(item => {
            const client = clients.find(c => c.id === item.clientId);
            return (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{client?.name} · {item.assignee}{item.due ? ` · ${item.due}` : ''}</p>
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
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-3 py-1 border rounded-lg text-sm">←</button>
            <h2 className="font-medium">{monthName}</h2>
            <button onClick={nextMonth} className="px-3 py-1 border rounded-lg text-sm">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayItems = itemsByDate[dateKey] || [];
              const isToday = dateKey === new Date().toISOString().slice(0, 10);
              return (
                <div key={day} className={`aspect-square border rounded-lg p-1 text-xs ${isToday ? 'border-foreground' : 'border-border'}`}>
                  <div className="font-medium">{day}</div>
                  <div className="space-y-0.5 mt-0.5 overflow-hidden">
                    {dayItems.slice(0, 2).map(item => (
                      <div key={item.id} className="truncate text-[10px] bg-muted rounded px-0.5" title={item.title}>
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
