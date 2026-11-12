'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Phone, Plus, Minus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useStore, update, uid, touch, logActivity, sum, inr, fmtDate, monthLabel, daysSince, expectedByNow, today, type Client, type Payment, type Expense, type Stage } from '@/lib/store';
import { useRole } from '@/lib/role';
import { useToast } from '@/components/toast';
import { Card, Button, Badge, HealthBadge, Avatar, ProgressBar, Field, Input, Select, Textarea, EmptyState, Sheet, SectionTitle, Segmented } from '@/components/ui';

const STATUSES: Client['status'][] = ['Onboarding', 'Active', 'Paused', 'Churned'];
const CATEGORIES = ['Ads', 'Shoot', 'Editing', 'Travel', 'Other'];

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const data = useStore();
  const { isOwner } = useRole();
  const toast = useToast();
  const client = data.clients.find(c => c.id === id);

  const [tab, setTab] = useState<'overview' | 'work' | 'money' | 'activity'>('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [money, setMoney] = useState<{ kind: 'payment' | 'expense'; editing?: string } | null>(null);
  const [mForm, setMForm] = useState({ amount: '', date: today(), note: '', category: 'Ads' });

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Clients</Link>
        <EmptyState title="Client not found" hint="It may have been removed, or this link is from another device's data." />
      </div>
    );
  }

  const requests = data.requests.filter(r => r.clientId === id);
  const content = data.content.filter(c => c.clientId === id);
  const tasks = data.tasks.filter(t => t.clientId === id);
  const received = sum(client.payments);
  const spent = sum(client.expenses);
  const expected = expectedByNow(client.videosPromised);
  const gap = expected - client.videosPosted;

  const setStatus = (status: Client['status']) => {
    if (status === 'Churned' && !confirm(`${client.name} will move to the Bin. Continue?`)) return;
    update(d => {
      const c = d.clients.find(x => x.id === id);
      if (!c || c.status === status) return;
      c.status = status;
      logActivity(d, id, `Status changed to ${status}`);
      touch(d, id);
    });
    toast(`Status: ${status}`);
  };

  const adjustPosted = (delta: number) => {
    update(d => {
      const c = d.clients.find(x => x.id === id);
      if (!c) return;
      const next = Math.max(0, c.videosPosted + delta);
      if (next === c.videosPosted) return;
      c.videosPosted = next;
      logActivity(d, id, `Videos posted set to ${next}/${c.videosPromised}`);
      touch(d, id);
    });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      const c = d.clients.find(x => x.id === id);
      if (!c) return;
      Object.assign(c, {
        name: (form.name || c.name).trim(),
        package: form.package ?? c.package,
        videosPromised: form.videosPromised ?? c.videosPromised,
        owner: form.owner ?? c.owner,
        monthlyFee: form.monthlyFee || undefined,
        onboardedOn: form.onboardedOn ?? c.onboardedOn,
        notes: form.notes ?? c.notes,
        contactName: form.contactName?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        instagram: form.instagram?.trim() || undefined,
        industry: form.industry ?? c.industry,
        city: form.city ?? c.city,
      });
      logActivity(d, id, 'Client details updated');
      touch(d, id);
    });
    setEditing(false);
    toast('Saved');
  };

  const openMoney = (kind: 'payment' | 'expense', existing?: Payment | Expense) => {
    setMForm({
      amount: existing ? String(existing.amount) : '',
      date: existing?.date || today(),
      note: existing?.note || '',
      category: (existing && 'category' in existing ? existing.category : 'Ads'),
    });
    setMoney({ kind, editing: existing?.id });
  };

  const saveMoney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!money) return;
    const amount = +mForm.amount;
    if (!(amount > 0)) return;
    update(d => {
      const c = d.clients.find(x => x.id === id);
      if (!c) return;
      if (money.kind === 'payment') {
        if (money.editing) {
          const p = (c.payments || []).find(x => x.id === money.editing);
          if (p) Object.assign(p, { amount, date: mForm.date, note: mForm.note });
        } else {
          c.payments = [{ id: uid(), amount, date: mForm.date, note: mForm.note }, ...(c.payments || [])];
          logActivity(d, id, `Payment of ${inr(amount)} recorded`);
        }
      } else {
        if (money.editing) {
          const ex = (c.expenses || []).find(x => x.id === money.editing);
          if (ex) Object.assign(ex, { amount, date: mForm.date, note: mForm.note, category: mForm.category });
        } else {
          c.expenses = [{ id: uid(), amount, date: mForm.date, category: mForm.category, note: mForm.note }, ...(c.expenses || [])];
          logActivity(d, id, `Expense of ${inr(amount)} · ${mForm.category}`);
        }
      }
      touch(d, id);
    });
    setMoney(null);
    toast(money.editing ? 'Updated' : 'Recorded');
  };

  const removeMoney = (kind: 'payment' | 'expense', mid: string) => {
    if (!confirm('Delete this entry?')) return;
    update(d => {
      const c = d.clients.find(x => x.id === id);
      if (!c) return;
      if (kind === 'payment') c.payments = (c.payments || []).filter(p => p.id !== mid);
      else c.expenses = (c.expenses || []).filter(x => x.id !== mid);
    });
    toast('Deleted');
  };

  const moveContent = (cid: string, stage: Stage) => {
    update(d => {
      const item = d.content.find(x => x.id === cid);
      const c = d.clients.find(x => x.id === id);
      if (!item || !c || item.stage === stage) return;
      const wasPosted = item.stage === 'posted';
      item.stage = stage;
      if (stage === 'posted' && !wasPosted) { c.videosPosted += 1; item.postedAt = new Date().toISOString(); logActivity(d, id, `Posted: ${item.title}`); }
      if (wasPosted && stage !== 'posted') { c.videosPosted = Math.max(0, c.videosPosted - 1); item.postedAt = undefined; logActivity(d, id, `Moved back from posted: ${item.title}`); }
      touch(d, id);
    });
  };

  const toggleTask = (tid: string) => {
    update(d => {
      const t = d.tasks.find(x => x.id === tid);
      if (!t) return;
      const done = t.status !== 'done';
      t.status = done ? 'done' : 'todo';
      t.doneAt = done ? new Date().toISOString() : undefined;
      logActivity(d, id, `${done ? 'Completed' : 'Reopened'} task: ${t.title}`);
      touch(d, id);
    });
  };

  const startEdit = () => {
    setForm({ ...client });
    setEditing(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Clients</Link>

      <div className="flex items-start gap-4">
        <Avatar name={client.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{client.name}</h1>
            <HealthBadge health={client.health} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{[client.industry, client.city, client.owner && `owned by ${client.owner}`].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {client.phone && <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 hover:bg-muted"><Phone className="h-3 w-3" /> {client.phone}</a>}
            {client.instagram && <a href={`https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 hover:bg-muted"><ExternalLink className="h-3 w-3" /> {client.instagram}</a>}
            {client.contactName && <span className="text-xs rounded-full border px-2.5 py-1 text-muted-foreground">{client.contactName}</span>}
          </div>
        </div>
        <Button size="sm" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status</span>
        <Segmented<Client['status']>
          value={client.status}
          onChange={setStatus}
          options={STATUSES.map(s => ({ value: s, label: s === 'Churned' ? 'Churned · bin' : s }))}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">This month</p>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => adjustPosted(-1)} aria-label="Decrease" className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
            <p className="text-xl font-semibold tabular-nums flex-1 text-center">{client.videosPosted}<span className="text-muted-foreground text-sm">/{client.videosPromised}</span></p>
            <button onClick={() => adjustPosted(1)} aria-label="Increase" className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <ProgressBar value={client.videosPosted} max={client.videosPromised} tone={client.health} className="mt-2" />
          <p className="text-[11px] text-muted-foreground mt-1.5">{gap > 0 ? `${gap} behind today's pace` : gap === 0 ? 'Exactly on pace' : `${-gap} ahead of pace`}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Monthly fee</p>
          <p className="text-xl font-semibold tabular-nums mt-1">{client.monthlyFee ? inr(client.monthlyFee) : '—'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Since {fmtDate(client.onboardedOn, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Last activity</p>
          <p className="text-xl font-semibold mt-1">{daysSince(client.lastActivityAt) === 0 ? 'Today' : `${daysSince(client.lastActivityAt)}d ago`}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{fmtDate(client.lastActivityAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
        </Card>
        {isOwner && (
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Profit so far</p>
            <p className={`text-xl font-semibold tabular-nums mt-1 ${received - spent >= 0 ? 'text-green' : 'text-red'}`}>{inr(received - spent)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{inr(received)} in · {inr(spent)} out</p>
          </Card>
        )}
      </div>

      <Segmented<'overview' | 'work' | 'money' | 'activity'>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'work', label: 'Work', count: requests.length + content.length + tasks.length },
          ...(isOwner ? [{ value: 'money' as const, label: 'Money' }] : []),
          { value: 'activity', label: 'Activity', count: (client.activity || []).length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <SectionTitle>Notes</SectionTitle>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{client.notes || 'No notes yet. Use Edit to add context the team should remember.'}</p>
          </Card>
          <Card className="p-5">
            <SectionTitle>Cycle history</SectionTitle>
            {(client.history || []).length === 0
              ? <p className="text-sm text-muted-foreground">History starts when the next month rolls over. This month&apos;s count resets automatically on the 1st.</p>
              : <div className="space-y-2">
                  {(client.history || []).map(h => {
                    const pct = h.promised > 0 ? Math.round((h.posted / h.promised) * 100) : 0;
                    return (
                      <div key={h.month} className="flex items-center gap-3 text-sm">
                        <span className="w-20 text-muted-foreground">{monthLabel(h.month)}</span>
                        <ProgressBar value={h.posted} max={h.promised} tone={pct >= 100 ? 'green' : pct >= 60 ? 'amber' : 'red'} className="flex-1" />
                        <span className="tabular-nums text-xs w-12 text-right">{h.posted}/{h.promised}</span>
                      </div>
                    );
                  })}
                </div>}
          </Card>
        </div>
      )}

      {tab === 'work' && (
        <div className="space-y-5">
          <section>
            <SectionTitle right={<Link href="/requests" className="text-xs text-muted-foreground hover:text-foreground">+ in Requests</Link>}>Requests</SectionTitle>
            {requests.length === 0 ? <EmptyState title="No requests logged" hint="Log calls and WhatsApp messages so nothing lives only in someone's memory." /> : (
              <Card>{requests.map(r => (
                <div key={r.id} className="px-4 py-3 border-b last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm">{r.body}</p>
                    <Badge tone={r.status === 'done' ? 'green' : r.status === 'new' ? 'amber' : 'neutral'}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.channel} · {r.loggedBy} · {fmtDate(r.receivedAt, { day: 'numeric', month: 'short' })}</p>
                </div>
              ))}</Card>
            )}
          </section>
          <section>
            <SectionTitle right={<Link href="/content" className="text-xs text-muted-foreground hover:text-foreground">+ in Content</Link>}>Content</SectionTitle>
            {content.length === 0 ? <EmptyState title="No content in the pipeline" /> : (
              <Card>{content.map(item => (
                <div key={item.id} className="px-4 py-3 border-b last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{item.assignee}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(['idea', 'planned', 'shot', 'editing', 'ready', 'approved', 'scheduled', 'posted'] as Stage[]).map(s => (
                      <button key={s} onClick={() => moveContent(item.id, s)} className={`text-[11px] px-2 py-1 rounded-full border ${item.stage === s ? 'bg-foreground text-background border-foreground' : 'hover:bg-muted'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}</Card>
            )}
          </section>
          <section>
            <SectionTitle right={<Link href="/tasks" className="text-xs text-muted-foreground hover:text-foreground">+ in Tasks</Link>}>Tasks</SectionTitle>
            {tasks.length === 0 ? <EmptyState title="No tasks for this client" /> : (
              <Card>{tasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                  <button onClick={() => toggleTask(t.id)} className={`h-5 w-5 rounded-full border-2 shrink-0 ${t.status === 'done' ? 'bg-green border-green' : 'border-foreground/30'}`} aria-label="Toggle task" />
                  <div className={`min-w-0 flex-1 ${t.status === 'done' ? 'line-through opacity-50' : ''}`}>
                    <p className="text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assignee}{t.due ? ` · due ${fmtDate(t.due)}` : ''}</p>
                  </div>
                  <Badge>{t.priority}</Badge>
                </div>
              ))}</Card>
            )}
          </section>
        </div>
      )}

      {tab === 'money' && isOwner && (
        <div className="grid lg:grid-cols-2 gap-4">
          <MoneyList title="Payments received" total={received} tone="green" onAdd={() => openMoney('payment')} empty="No payments recorded yet."
            rows={(client.payments || []).map(p => ({ id: p.id, main: `${inr(p.amount)}${p.note ? ` · ${p.note}` : ''}`, sub: fmtDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' }), onEdit: () => openMoney('payment', p), onDelete: () => removeMoney('payment', p.id) }))} />
          <MoneyList title="Expenses" total={spent} tone="red" onAdd={() => openMoney('expense')} empty="No expenses recorded yet."
            rows={(client.expenses || []).map(x => ({ id: x.id, main: `${inr(x.amount)} · ${x.category}${x.note ? ` · ${x.note}` : ''}`, sub: fmtDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' }), onEdit: () => openMoney('expense', x), onDelete: () => removeMoney('expense', x.id) }))} />
        </div>
      )}

      {tab === 'activity' && (
        (client.activity || []).length === 0
          ? <EmptyState title="No activity yet" hint="Status changes, payments, posted videos and edits are recorded here automatically." />
          : <Card>{(client.activity || []).map(a => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 border-b last:border-b-0 text-sm">
                <span>{a.text}</span>
                <span className="text-xs text-muted-foreground shrink-0">{fmtDate(a.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            ))}</Card>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit client" footer={<><Button onClick={() => setEditing(false)}>Cancel</Button><Button form="edit-client" type="submit" variant="primary">Save changes</Button></>}>
        <form id="edit-client" onSubmit={saveEdit} className="space-y-3">
          <Field label="Name"><Input required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Package"><Input value={form.package || ''} onChange={e => setForm({ ...form, package: e.target.value })} /></Field>
            <Field label="Videos / month"><Input type="number" min={1} value={form.videosPromised || 0} onChange={e => setForm({ ...form, videosPromised: +e.target.value })} /></Field>
            <Field label="Account owner">
              <Select value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value })}>
                <option value="">Unassigned</option>
                {data.team.map(m => <option key={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Monthly fee (₹)"><Input type="number" min={0} value={form.monthlyFee || ''} onChange={e => setForm({ ...form, monthlyFee: +e.target.value })} /></Field>
            <Field label="Contact person"><Input value={form.contactName || ''} onChange={e => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="Instagram"><Input value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@handle" /></Field>
            <Field label="Onboarded"><Input type="date" value={form.onboardedOn || ''} onChange={e => setForm({ ...form, onboardedOn: e.target.value })} /></Field>
            <Field label="City"><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Industry"><Input value={form.industry || ''} onChange={e => setForm({ ...form, industry: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></Field>
        </form>
      </Sheet>

      <Sheet open={!!money} onClose={() => setMoney(null)} title={money?.kind === 'expense' ? (money.editing ? 'Edit expense' : 'Add expense') : (money?.editing ? 'Edit payment' : 'Add payment')}
        footer={<><Button onClick={() => setMoney(null)}>Cancel</Button><Button form="money-form" type="submit" variant="primary">Save</Button></>}>
        <form id="money-form" onSubmit={saveMoney} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)"><Input required type="number" min={1} autoFocus value={mForm.amount} onChange={e => setMForm({ ...mForm, amount: e.target.value })} /></Field>
            <Field label="Date"><Input required type="date" value={mForm.date} onChange={e => setMForm({ ...mForm, date: e.target.value })} /></Field>
          </div>
          {money?.kind === 'expense' && (
            <Field label="Category">
              <Select value={mForm.category} onChange={e => setMForm({ ...mForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Note"><Input value={mForm.note} onChange={e => setMForm({ ...mForm, note: e.target.value })} placeholder="Optional" /></Field>
        </form>
      </Sheet>
    </div>
  );
}

function MoneyList({ title, total, tone, onAdd, empty, rows }: { title: string; total: number; tone: 'green' | 'red'; onAdd: () => void; empty: string; rows: { id: string; main: string; sub: string; onEdit: () => void; onDelete: () => void }[] }) {
  return (
    <Card className="p-5">
      <SectionTitle right={<Button size="sm" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> Add</Button>}>{title}</SectionTitle>
      <p className={`text-lg font-semibold tabular-nums mb-3 ${tone === 'green' ? 'text-green' : 'text-red'}`}>{inr(total)}</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 border-b last:border-b-0 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{r.main}</p>
                <p className="text-xs text-muted-foreground">{r.sub}</p>
              </div>
              <button onClick={r.onEdit} aria-label="Edit" className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={r.onDelete} aria-label="Delete" className="h-8 w-8 rounded-lg hover:bg-red-soft flex items-center justify-center text-muted-foreground hover:text-red"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
