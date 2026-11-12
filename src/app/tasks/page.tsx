'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useStore, update, uid, touch, logActivity, clientName, fmtDate, today, isOverdue, type Task, type Priority } from '@/lib/store';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Field, Input, Select, Segmented, EmptyState, Sheet, PriorityBadge } from '@/components/ui';

type Filter = 'open' | 'today' | 'overdue' | 'done';
const blank = { title: '', clientId: '', assignee: '', priority: 'P2' as Priority, due: today() };

export default function TasksPage() {
  const data = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const [assignee, setAssignee] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank);

  const members = data.team.map(m => m.name);
  const clients = data.clients.filter(c => c.status !== 'Churned');
  const day = today();

  const matches = (t: Task) => {
    if (assignee && t.assignee !== assignee) return false;
    if (filter === 'done') return t.status === 'done';
    if (t.status === 'done') return false;
    if (filter === 'today') return t.due === day;
    if (filter === 'overdue') return isOverdue(t.due, t.status);
    return true;
  };

  const groups: { label: string; items: Task[] }[] = [];
  const visible = data.tasks.filter(matches);
  if (filter === 'done') {
    groups.push({ label: 'Completed', items: visible });
  } else {
    const buckets = [
      { label: 'Overdue', items: visible.filter(t => isOverdue(t.due, t.status)) },
      { label: 'Today', items: visible.filter(t => t.due === day) },
      { label: 'Upcoming', items: visible.filter(t => t.due > day) },
      { label: 'No date', items: visible.filter(t => !t.due) },
    ];
    for (const b of buckets) {
      b.items.sort((a, c) => (a.due || '').localeCompare(c.due || '') || a.priority.localeCompare(c.priority));
      if (b.items.length) groups.push(b);
    }
  }

  const counts = {
    open: data.tasks.filter(t => t.status !== 'done').length,
    today: data.tasks.filter(t => t.status !== 'done' && t.due === day).length,
    overdue: data.tasks.filter(t => isOverdue(t.due, t.status)).length,
    done: data.tasks.filter(t => t.status === 'done').length,
  };

  const openNew = () => { setForm({ ...blank, assignee: assignee || '' }); setEditing('new'); };
  const openEdit = (t: Task) => { setForm({ title: t.title, clientId: t.clientId || '', assignee: t.assignee, priority: t.priority, due: t.due }); setEditing(t.id); };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      if (editing === 'new') {
        d.tasks.unshift({ id: uid(), title: form.title.trim(), clientId: form.clientId || undefined, assignee: form.assignee, priority: form.priority, due: form.due, status: 'todo', createdAt: new Date().toISOString() });
        if (form.clientId) { logActivity(d, form.clientId, `Task added: ${form.title.trim()}`); touch(d, form.clientId); }
      } else {
        const t = d.tasks.find(x => x.id === editing);
        if (t) Object.assign(t, { title: form.title.trim(), clientId: form.clientId || undefined, assignee: form.assignee, priority: form.priority, due: form.due });
      }
    });
    toast(editing === 'new' ? 'Task added' : 'Task updated');
    setEditing(null);
  };

  const toggle = (id: string) => {
    let done = false;
    update(d => {
      const t = d.tasks.find(x => x.id === id);
      if (!t) return;
      done = t.status !== 'done';
      t.status = done ? 'done' : 'todo';
      t.doneAt = done ? new Date().toISOString() : undefined;
      if (t.clientId) { logActivity(d, t.clientId, `${done ? 'Completed' : 'Reopened'} task: ${t.title}`); touch(d, t.clientId); }
    });
    toast(done ? 'Task done' : 'Reopened');
  };

  const remove = (id: string) => {
    if (!confirm('Delete this task?')) return;
    update(d => { d.tasks = d.tasks.filter(t => t.id !== id); });
    toast('Task deleted');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Tasks" subtitle="Everything that is not a video"
        actions={<Button size="sm" variant="primary" onClick={openNew}><Plus className="h-3.5 w-3.5" /> Task</Button>}>
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'open', label: 'Open', count: counts.open },
          { value: 'today', label: 'Today', count: counts.today },
          { value: 'overdue', label: 'Overdue', count: counts.overdue },
          { value: 'done', label: 'Done', count: counts.done },
        ]} />
      </PageHeader>

      <Select value={assignee} onChange={e => setAssignee(e.target.value)} className="sm:w-56">
        <option value="">Everyone</option>
        {members.map(n => <option key={n}>{n}</option>)}
      </Select>

      {groups.length === 0 && <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={filter === 'done' ? 'Nothing completed yet' : 'No tasks here'} hint="Tasks are the non-video work: ad setup, calls, reports, follow-ups." action={<Button size="sm" variant="primary" onClick={openNew}>Add a task</Button>} />}

      {groups.map(g => (
        <section key={g.label}>
          <h2 className={`text-[13px] font-medium uppercase tracking-wide mb-2 ${g.label === 'Overdue' ? 'text-red' : 'text-muted-foreground'}`}>{g.label} · {g.items.length}</h2>
          <Card>
            {g.items.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                <button onClick={() => toggle(t.id)} aria-label="Toggle" className={`h-6 w-6 rounded-full border-2 shrink-0 flex items-center justify-center ${t.status === 'done' ? 'bg-green border-green text-white' : 'border-foreground/30 hover:border-green'}`}>
                  {t.status === 'done' && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <div className={`min-w-0 flex-1 ${t.status === 'done' ? 'line-through opacity-50' : ''}`}>
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[t.clientId && clientName(data, t.clientId), t.assignee || 'Unassigned', t.due && fmtDate(t.due)].filter(Boolean).join(' · ')}
                    {t.clientId && <> · <Link href={`/clients/${t.clientId}`} className="hover:underline">open client</Link></>}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
                {isOverdue(t.due, t.status) && <span className="text-[11px] text-red shrink-0">Overdue</span>}
                <button onClick={() => openEdit(t)} aria-label="Edit" className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(t.id)} aria-label="Delete" className="h-8 w-8 rounded-lg hover:bg-red-soft flex items-center justify-center text-muted-foreground hover:text-red"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </Card>
        </section>
      ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New task' : 'Edit task'} footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button form="task-form" type="submit" variant="primary">Save</Button></>}>
        <form id="task-form" onSubmit={save} className="space-y-3">
          <Field label="Task"><Input required autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs doing?" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <Select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Internal</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Assign to">
              <Select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="P1">P1 · Urgent</option><option value="P2">P2 · Normal</option><option value="P3">P3 · Low</option>
              </Select>
            </Field>
            <Field label="Due"><Input type="date" required value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
