'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, update, uid, touch, logActivity, clientName, today, STAGES, type Stage, type ContentItem } from '@/lib/store';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Field, Input, Select, Segmented, EmptyState, Sheet, Badge } from '@/components/ui';

const blank = { clientId: '', title: '', stage: 'idea' as Stage, assignee: '', due: '' };

export default function ContentPage() {
  const data = useStore();
  const toast = useToast();
  const [view, setView] = useState<'board' | 'calendar'>('board');
  const [clientFilter, setClientFilter] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const members = data.team.map(m => m.name);
  const clients = data.clients.filter(c => c.status !== 'Churned');
  const items = data.content.filter(i => !clientFilter || i.clientId === clientFilter);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      d.content.unshift({ id: uid(), clientId: form.clientId, title: form.title.trim(), stage: form.stage, assignee: form.assignee, due: form.due || undefined, createdAt: new Date().toISOString() });
      logActivity(d, form.clientId, `Content added: ${form.title.trim()}`);
      touch(d, form.clientId);
    });
    toast('Content added');
    setShow(false);
    setForm(blank);
  };

  const move = (id: string, stage: Stage) => {
    update(d => {
      const item = d.content.find(x => x.id === id);
      const c = item && d.clients.find(x => x.id === item.clientId);
      if (!item || !c || item.stage === stage) return;
      const wasPosted = item.stage === 'posted';
      item.stage = stage;
      if (stage === 'posted' && !wasPosted) { c.videosPosted += 1; item.postedAt = new Date().toISOString(); logActivity(d, c.id, `Posted: ${item.title}`); }
      if (wasPosted && stage !== 'posted') { c.videosPosted = Math.max(0, c.videosPosted - 1); item.postedAt = undefined; logActivity(d, c.id, `Moved back from posted: ${item.title}`); }
      touch(d, c.id);
    });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this content item? If it was posted, the client count is reduced by one.')) return;
    update(d => {
      const item = d.content.find(x => x.id === id);
      if (item?.stage === 'posted') {
        const c = d.clients.find(x => x.id === item.clientId);
        if (c) c.videosPosted = Math.max(0, c.videosPosted - 1);
      }
      d.content = d.content.filter(x => x.id !== id);
    });
    toast('Deleted');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title="Content" subtitle="Idea to posted, one stage at a time"
        actions={<Button size="sm" variant="primary" onClick={() => setShow(true)}><Plus className="h-3.5 w-3.5" /> Content</Button>}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Segmented<'board' | 'calendar'> value={view} onChange={setView} options={[{ value: 'board', label: 'Board' }, { value: 'calendar', label: 'Calendar' }]} />
          <Select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="sm:w-56 sm:ml-auto">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </PageHeader>

      {data.content.length === 0 && view === 'board' && <EmptyState title="Pipeline is empty" hint="Add every video, reel and poster here. Moving an item to Posted updates the client's monthly count automatically." action={<Button size="sm" variant="primary" onClick={() => setShow(true)}>Add content</Button>} />}

      {view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {STAGES.map(stage => {
            const col = items.filter(i => i.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stage}</h2>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{col.length}</span>
                </div>
                <div className="space-y-2 min-h-24">
                  {col.map(item => <ContentCard key={item.id} item={item} name={clientName(data, item.clientId)} onMove={s => move(item.id, s)} onDelete={() => remove(item.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Calendar cursor={cursor} setCursor={setCursor} items={items} names={(id) => clientName(data, id)} />
      )}

      <Sheet open={show} onClose={() => setShow(false)} title="New content" footer={<><Button onClick={() => setShow(false)}>Cancel</Button><Button form="add-content" type="submit" variant="primary">Add</Button></>}>
        <form id="add-content" onSubmit={add} className="space-y-3">
          <Field label="Client">
            <Select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Title / idea"><Input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What is this piece about?" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stage">
              <Select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value as Stage })}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Assignee">
              <Select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Due"><Input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

function ContentCard({ item, name, onMove, onDelete }: { item: ContentItem; name?: string; onMove: (s: Stage) => void; onDelete: () => void }) {
  const idx = STAGES.indexOf(item.stage);
  return (
    <Card className="p-3 space-y-2">
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <Link href={`/clients/${item.clientId}`} className="truncate hover:underline">{name}</Link>
        {item.assignee && <span className="shrink-0">{item.assignee}</span>}
      </div>
      {item.due && <p className={`text-[11px] ${item.due < today() && item.stage !== 'posted' ? 'text-red' : 'text-muted-foreground'}`}>Due {item.due.slice(5)}</p>}
      <div className="flex items-center gap-1 pt-1">
        <button disabled={idx === 0} onClick={() => onMove(STAGES[idx - 1])} className="flex-1 text-[11px] rounded-lg border py-1 hover:bg-muted disabled:opacity-30">← {idx > 0 ? STAGES[idx - 1] : ''}</button>
        <button disabled={idx === STAGES.length - 1} onClick={() => onMove(STAGES[idx + 1])} className="flex-1 text-[11px] rounded-lg border py-1 hover:bg-muted disabled:opacity-30">{idx < STAGES.length - 1 ? STAGES[idx + 1] : ''} →</button>
      </div>
      <button onClick={onDelete} className="text-[11px] text-muted-foreground hover:text-red">Delete</button>
    </Card>
  );
}

function Calendar({ cursor, setCursor, items, names }: { cursor: Date; setCursor: (d: Date) => void; items: ContentItem[]; names: (id: string) => string | undefined }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const label = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const todayKey = today();

  const byDate: Record<string, ContentItem[]> = {};
  for (const item of items) {
    const key = item.due || item.createdAt.slice(0, 10);
    (byDate[key] ||= []).push(item);
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month" className="h-9 w-9 rounded-xl border flex items-center justify-center hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <h2 className="font-medium">{label}</h2>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month" className="h-9 w-9 rounded-xl border flex items-center justify-center hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayItems = byDate[key] || [];
          return (
            <div key={day} className={`min-h-16 sm:min-h-24 rounded-xl border p-1.5 ${key === todayKey ? 'border-foreground' : ''}`}>
              <div className={`text-xs font-medium ${key === todayKey ? '' : 'text-muted-foreground'}`}>{day}</div>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map(item => (
                  <div key={item.id} className="truncate text-[10px] rounded-md bg-muted px-1 py-0.5" title={`${item.title} · ${names(item.clientId) || ''}`}>
                    {item.title}
                  </div>
                ))}
                {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><Badge>Due date</Badge> Items appear on their due date, or their creation date when no due date is set.</div>
    </Card>
  );
}
