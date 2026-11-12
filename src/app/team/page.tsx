'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore, update, uid, today, type Member, type MemberRole } from '@/lib/store';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Field, Input, Select, Avatar, Badge, EmptyState, Sheet } from '@/components/ui';

const ROLES: MemberRole[] = ['Owner', 'Manager', 'Editor', 'Shooter', 'Designer'];
const blank = { name: '', role: 'Editor' as MemberRole, focus: '', phone: '' };

export default function TeamPage() {
  const data = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(blank);

  const day = today();
  const workload = (name: string) => ({
    clients: data.clients.filter(c => c.owner === name && c.status !== 'Churned').length,
    tasks: data.tasks.filter(t => t.assignee === name && t.status !== 'done').length,
    overdue: data.tasks.filter(t => t.assignee === name && t.status !== 'done' && t.due && t.due < day).length,
    content: data.content.filter(c => c.assignee === name && c.stage !== 'posted').length,
    requests: data.requests.filter(r => r.assignee === name && r.status !== 'done').length,
  });

  const openNew = () => { setForm(blank); setEditing('new'); };
  const openEdit = (m: Member) => { setForm({ name: m.name, role: m.role, focus: m.focus, phone: m.phone || '' }); setEditing(m.id); };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (data.team.some(m => m.name.toLowerCase() === name.toLowerCase() && m.id !== editing)) {
      alert(`${name} is already on the team. Names must be unique because work is assigned by name.`);
      return;
    }
    update(d => {
      if (editing === 'new') {
        d.team.push({ id: uid(), name, role: form.role, focus: form.focus.trim(), phone: form.phone.trim() || undefined });
      } else {
        const m = d.team.find(x => x.id === editing);
        if (!m) return;
        const old = m.name;
        Object.assign(m, { name, role: form.role, focus: form.focus.trim(), phone: form.phone.trim() || undefined });
        if (old !== name) {
          for (const c of d.clients) if (c.owner === old) c.owner = name;
          for (const t of d.tasks) if (t.assignee === old) t.assignee = name;
          for (const c of d.content) if (c.assignee === old) c.assignee = name;
          for (const r of d.requests) if (r.assignee === old || r.loggedBy === old) {
            if (r.assignee === old) r.assignee = name;
            if (r.loggedBy === old) r.loggedBy = name;
          }
        }
      }
    });
    toast(editing === 'new' ? `${name} added` : 'Updated');
    setEditing(null);
  };

  const remove = (m: Member) => {
    const w = workload(m.name);
    const attached = w.clients + w.tasks + w.content + w.requests;
    if (!confirm(attached ? `${m.name} still owns ${w.clients} clients and ${w.tasks} open tasks. Remove them from the team anyway? Their existing assignments stay as-is.` : `Remove ${m.name} from the team?`)) return;
    update(d => { d.team = d.team.filter(x => x.id !== m.id); });
    toast(`${m.name} removed`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Team" subtitle={`${data.team.length} people`}
        actions={<Button size="sm" variant="primary" onClick={openNew}><Plus className="h-3.5 w-3.5" /> Member</Button>} />

      {data.team.length === 0 && <EmptyState title="No team members" hint="Add the people who own clients, shoot and edit, so work can be assigned to them." action={<Button size="sm" variant="primary" onClick={openNew}>Add member</Button>} />}

      <div className="grid sm:grid-cols-2 gap-3">
        {data.team.map(m => {
          const w = workload(m.name);
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{m.name}</p>
                    <Badge>{m.role}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.focus || 'No focus set'}</p>
                  {m.phone && <a href={`tel:${m.phone}`} className="text-xs text-muted-foreground hover:text-foreground">{m.phone}</a>}
                </div>
                <button onClick={() => openEdit(m)} aria-label="Edit" className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(m)} aria-label="Remove" className="h-8 w-8 rounded-lg hover:bg-red-soft flex items-center justify-center text-muted-foreground hover:text-red"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                <Metric label="Clients" value={w.clients} href="/clients" />
                <Metric label="Tasks" value={w.tasks} warn={w.overdue} href="/tasks" />
                <Metric label="Content" value={w.content} href="/content" />
                <Metric label="Requests" value={w.requests} href="/requests" />
              </div>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New member' : 'Edit member'} footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button form="member-form" type="submit" variant="primary">Save</Button></>}>
        <form id="member-form" onSubmit={save} className="space-y-3">
          <Field label="Name"><Input required autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as MemberRole })}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></Field>
          </div>
          <Field label="Focus"><Input value={form.focus} onChange={e => setForm({ ...form, focus: e.target.value })} placeholder="e.g. Automotive clients" /></Field>
          {editing !== 'new' && <p className="text-xs text-muted-foreground">Renaming updates every client, task, content item and request assigned to this person.</p>}
        </form>
      </Sheet>
    </div>
  );
}

function Metric({ label, value, warn, href }: { label: string; value: number; warn?: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-muted px-1 py-2 hover:bg-border transition-colors">
      <p className={`text-base font-semibold tabular-nums ${warn ? 'text-red' : ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{warn ? `${label} · ${warn} late` : label}</p>
    </Link>
  );
}
