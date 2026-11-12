'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight, Film, CheckCircle2 } from 'lucide-react';
import { useStore, update, uid, touch, logActivity, clientName, fmtDate, today, type RequestItem, type Priority, type Stage } from '@/lib/store';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Badge, Field, Input, Select, Textarea, Segmented, EmptyState, Sheet, PriorityBadge } from '@/components/ui';

type Filter = 'open' | 'new' | 'done' | 'all';

const blank = { clientId: '', body: '', channel: 'whatsapp' as RequestItem['channel'], loggedBy: '', priority: 'P2' as Priority, due: '' };

export default function RequestsPage() {
  const data = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [converting, setConverting] = useState<string | null>(null);
  const [conv, setConv] = useState({ kind: 'task' as 'task' | 'content', assignee: '', due: today(), stage: 'idea' as Stage, title: '' });

  const members = data.team.map(m => m.name);
  const clients = data.clients.filter(c => c.status !== 'Churned');
  const counts = {
    open: data.requests.filter(r => r.status !== 'done').length,
    new: data.requests.filter(r => r.status === 'new').length,
    done: data.requests.filter(r => r.status === 'done').length,
    all: data.requests.length,
  };
  const list = data.requests.filter(r => filter === 'all' || (filter === 'done' ? r.status === 'done' : filter === 'new' ? r.status === 'new' : r.status !== 'done'));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      d.requests.unshift({ id: uid(), clientId: form.clientId, body: form.body.trim(), channel: form.channel, receivedAt: new Date().toISOString(), loggedBy: form.loggedBy || members[0] || '', status: 'new', priority: form.priority, due: form.due || undefined });
      logActivity(d, form.clientId, `Request logged: ${form.body.trim().slice(0, 80)}`);
      touch(d, form.clientId);
    });
    toast('Request logged');
    setShow(false);
    setForm(blank);
  };

  const setStatus = (id: string, status: RequestItem['status']) => {
    update(d => {
      const r = d.requests.find(x => x.id === id);
      if (!r) return;
      r.status = status;
      logActivity(d, r.clientId, `Request ${status}: ${r.body.slice(0, 60)}`);
      touch(d, r.clientId);
    });
    toast(status === 'done' ? 'Marked done' : 'Updated');
  };

  const assign = (id: string, assignee: string) => {
    update(d => {
      const r = d.requests.find(x => x.id === id);
      if (!r) return;
      r.assignee = assignee || undefined;
      if (assignee && r.status === 'new') r.status = 'triaged';
      if (assignee) logActivity(d, r.clientId, `Request assigned to ${assignee}`);
      touch(d, r.clientId);
    });
  };

  const openConvert = (r: RequestItem) => {
    setConv({ kind: 'task', assignee: r.assignee || members[0] || '', due: r.due || today(), stage: 'idea', title: r.body.slice(0, 80) });
    setConverting(r.id);
  };

  const convert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!converting) return;
    update(d => {
      const r = d.requests.find(x => x.id === converting);
      if (!r) return;
      if (conv.kind === 'task') {
        const id = uid();
        d.tasks.unshift({ id, clientId: r.clientId, title: conv.title.trim() || r.body, assignee: conv.assignee, priority: r.priority || 'P2', due: conv.due, status: 'todo', createdAt: new Date().toISOString(), sourceRequestId: r.id });
        r.linkedTaskId = id;
      } else {
        const id = uid();
        d.content.unshift({ id, clientId: r.clientId, title: conv.title.trim() || r.body, stage: conv.stage, assignee: conv.assignee, due: conv.due || undefined, createdAt: new Date().toISOString(), sourceRequestId: r.id });
        r.linkedContentId = id;
      }
      r.status = 'in-progress';
      logActivity(d, r.clientId, `Request turned into ${conv.kind === 'task' ? 'a task' : 'content'}: ${conv.title.trim().slice(0, 60)}`);
      touch(d, r.clientId);
    });
    toast(conv.kind === 'task' ? 'Task created' : 'Content created');
    setConverting(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Requests" subtitle="Every call and WhatsApp, logged before work starts"
        actions={<Button size="sm" variant="primary" onClick={() => setShow(true)}><Plus className="h-3.5 w-3.5" /> Request</Button>}>
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'open', label: 'Open', count: counts.open },
          { value: 'new', label: 'New', count: counts.new },
          { value: 'done', label: 'Done', count: counts.done },
          { value: 'all', label: 'All', count: counts.all },
        ]} />
      </PageHeader>

      {list.length === 0 && <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={filter === 'new' ? 'Inbox zero' : 'No requests here'} hint="Log a request the moment a client asks for something, then turn it into a task or a content item." action={<Button size="sm" variant="primary" onClick={() => setShow(true)}>Log a request</Button>} />}

      <div className="space-y-3">
        {list.map(r => {
          const name = clientName(data, r.clientId);
          return (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/clients/${r.clientId}`} className="font-medium text-sm hover:underline">{name || 'Unknown client'}</Link>
                    <PriorityBadge priority={r.priority || 'P2'} />
                    <Badge tone={r.status === 'done' ? 'green' : r.status === 'new' ? 'amber' : 'neutral'}>{r.status}</Badge>
                  </div>
                  <p className="text-sm mt-1.5 whitespace-pre-wrap">{r.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.channel} · {r.loggedBy || 'unlogged'} · {fmtDate(r.receivedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    {r.due ? ` · due ${fmtDate(r.due)}` : ''}
                  </p>
                </div>
              </div>

              {r.status !== 'done' && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  <Select value={r.assignee || ''} onChange={e => assign(r.id, e.target.value)} className="!w-auto min-w-40 text-xs h-8">
                    <option value="">Assign…</option>
                    {members.map(n => <option key={n}>{n}</option>)}
                  </Select>
                  <Button size="sm" onClick={() => openConvert(r)}><ArrowRight className="h-3.5 w-3.5" /> Turn into work</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, 'done')} className="ml-auto"><CheckCircle2 className="h-3.5 w-3.5" /> Done</Button>
                </div>
              )}

              {(r.linkedTaskId || r.linkedContentId) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {r.linkedTaskId && <Link href="/tasks" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 hover:bg-border">Task linked</Link>}
                  {r.linkedContentId && <Link href="/content" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 hover:bg-border"><Film className="h-3 w-3" /> Content linked</Link>}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Sheet open={show} onClose={() => setShow(false)} title="Log a request" footer={<><Button onClick={() => setShow(false)}>Cancel</Button><Button form="add-req" type="submit" variant="primary">Log request</Button></>}>
        <form id="add-req" onSubmit={add} className="space-y-3">
          <Field label="Client">
            <Select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="What did they ask?"><Textarea required autoFocus value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="In their words, briefly" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <Select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as RequestItem['channel'] })}>
                <option value="whatsapp">WhatsApp</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Logged by">
              <Select value={form.loggedBy} onChange={e => setForm({ ...form, loggedBy: e.target.value })}>
                <option value="">—</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="P1">P1 · Urgent</option><option value="P2">P2 · Normal</option><option value="P3">P3 · Low</option>
              </Select>
            </Field>
            <Field label="Due (optional)"><Input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field>
          </div>
        </form>
      </Sheet>

      <Sheet open={!!converting} onClose={() => setConverting(null)} title="Turn into work" footer={<><Button onClick={() => setConverting(null)}>Cancel</Button><Button form="convert" type="submit" variant="primary">Create</Button></>}>
        <form id="convert" onSubmit={convert} className="space-y-3">
          <Segmented<'task' | 'content'> value={conv.kind} onChange={k => setConv({ ...conv, kind: k })} options={[{ value: 'task', label: 'Task' }, { value: 'content', label: 'Content item' }]} />
          <Field label="Title"><Input required value={conv.title} onChange={e => setConv({ ...conv, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign to">
              <Select value={conv.assignee} onChange={e => setConv({ ...conv, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Due"><Input type="date" value={conv.due} onChange={e => setConv({ ...conv, due: e.target.value })} /></Field>
          </div>
          {conv.kind === 'content' && (
            <Field label="Starting stage">
              <Select value={conv.stage} onChange={e => setConv({ ...conv, stage: e.target.value as Stage })}>
                <option value="idea">Idea</option><option value="planned">Planned</option><option value="shot">Shot</option>
              </Select>
            </Field>
          )}
        </form>
      </Sheet>
    </div>
  );
}
