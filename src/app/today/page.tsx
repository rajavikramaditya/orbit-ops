'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, Inbox, Moon, CheckCircle2, Plus, Hourglass, Users, Wallet, ShieldAlert, Copy, MessageCircle } from 'lucide-react';
import { useStore, update, touch, uid, today, pendency, formatDay, daysSince, clientName, inr, fmtDate, isOverdue, sum, stuckContent, stageDays, memberLoad, dueNow, whatsappLink, daysSinceBackup, BACKUP_EVERY_DAYS, type Task, type RequestItem } from '@/lib/store';
import { useRole } from '@/lib/role';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Stat, SectionTitle, HealthBadge, PriorityBadge, ProgressBar, EmptyState, Sheet, Field, Input, Select, Textarea } from '@/components/ui';

export default function TodayPage() {
  const data = useStore();
  const { isOwner } = useRole();
  const toast = useToast();
  const router = useRouter();
  const [quick, setQuick] = useState<'task' | 'request' | null>(null);
  const backupAge = useSyncExternalStore(() => () => {}, daysSinceBackup, () => undefined);

  const day = today();
  const active = data.clients.filter(c => c.status === 'Active');
  const behind = active.filter(c => pendency(c).gap > 1);
  const atRisk = data.clients.filter(c => c.status !== 'Churned' && c.health === 'red');
  const quiet = active.filter(c => daysSince(c.lastActivityAt) >= 5).sort((a, b) => daysSince(b.lastActivityAt) - daysSince(a.lastActivityAt));
  const newRequests = data.requests.filter(r => r.status === 'new');
  const openTasks = data.tasks.filter(t => t.status !== 'done');
  const overdue = openTasks.filter(t => isOverdue(t.due)).sort((a, b) => a.due.localeCompare(b.due));
  const dueToday = openTasks.filter(t => t.due === day);

  const expected = active.reduce((s, c) => s + (c.monthlyFee || 0), 0);
  const received = active.reduce((s, c) => s + sum(c.payments), 0);

  const stuck = stuckContent(data);
  const load = data.team
    .map(m => ({ m, ...memberLoad(data, m.name) }))
    .filter(x => x.open > 0)
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open);
  const dues = isOwner
    ? active.map(c => ({ c, ...dueNow(c) })).filter(x => x.due > 0 && x.daysIn >= 5).sort((a, b) => b.due - a.due)
    : [];
  const duesTotal = dues.reduce((s, x) => s + x.due, 0);

  const summary = () => {
    const lines = [
      `*${data.settings.companyName} · ${dateLabel}*`,
      `Overdue tasks: ${overdue.length} · New requests: ${newRequests.length}`,
      behind.length ? `Behind pace: ${behind.map(c => `${c.name} (${pendency(c).gap})`).join(', ')}` : 'Behind pace: none',
      stuck.length ? `Stuck content: ${stuck.slice(0, 5).map(i => `${i.title} (${stageDays(i)}d ${i.stage})`).join(', ')}` : 'Stuck content: none',
    ];
    navigator.clipboard?.writeText(lines.join('\n')).then(() => toast('Summary copied for WhatsApp'), () => toast('Could not copy'));
  };

  const complete = (id: string) => {
    update(d => {
      const t = d.tasks.find(x => x.id === id);
      if (!t) return;
      t.status = 'done';
      t.doneAt = new Date().toISOString();
      if (t.clientId) { touch(d, t.clientId); }
    });
    toast('Task done');
  };

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const attention = overdue.length + newRequests.length + atRisk.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Today"
        subtitle={dateLabel}
        actions={
          <>
            <Button size="sm" onClick={summary}><Copy className="h-3.5 w-3.5" /> Summary</Button>
            <Button size="sm" onClick={() => setQuick('request')}><Plus className="h-3.5 w-3.5" /> Request</Button>
            <Button size="sm" variant="primary" onClick={() => setQuick('task')}><Plus className="h-3.5 w-3.5" /> Task</Button>
          </>
        }
      >
        <p className="text-sm">{attention === 0 ? 'Nothing urgent. A good day to get ahead on content.' : `${attention} thing${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} attention before anything else.`}</p>
      </PageHeader>

      {(backupAge === null || (typeof backupAge === 'number' && backupAge >= BACKUP_EVERY_DAYS)) && (
        <Link href="/settings" className="flex items-start gap-2.5 rounded-xl border border-amber/40 bg-amber-soft px-4 py-3 text-sm">
          <ShieldAlert className="h-4 w-4 text-amber mt-0.5 shrink-0" />
          <span>Your data lives only in this browser. {backupAge === null ? 'No backup has been downloaded yet.' : `Last backup was ${backupAge} days ago.`} <span className="underline">Download one now</span>.</span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Overdue tasks" value={overdue.length} tone={overdue.length ? 'red' : undefined} hint={`${openTasks.length} open in total`} />
        <Stat label="New requests" value={newRequests.length} tone={newRequests.length ? 'amber' : undefined} hint="Waiting to be triaged" />
        <Stat label="Behind pace" value={behind.length} tone={behind.length ? 'amber' : undefined} hint={`of ${active.length} active clients`} />
        {isOwner
          ? <Stat label="Collected" value={inr(received)} hint={`${inr(expected)} expected this month`} />
          : <Stat label="At risk" value={atRisk.length} tone={atRisk.length ? 'red' : undefined} hint="Clients going quiet" />}
      </div>

      {overdue.length > 0 && (
        <section>
          <SectionTitle><span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-red" /> Overdue</span></SectionTitle>
          <Card>
            {overdue.map(t => <TaskRow key={t.id} task={t} client={clientName(data, t.clientId)} onDone={() => complete(t.id)} />)}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle><span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Due today</span></SectionTitle>
        {dueToday.length === 0
          ? <EmptyState title="Nothing due today" hint="Tasks with today's date show up here." />
          : <Card>{dueToday.map(t => <TaskRow key={t.id} task={t} client={clientName(data, t.clientId)} onDone={() => complete(t.id)} />)}</Card>}
      </section>

      {newRequests.length > 0 && (
        <section>
          <SectionTitle right={<Link href="/requests" className="text-xs text-muted-foreground hover:text-foreground">All requests</Link>}><span className="inline-flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" /> New requests</span></SectionTitle>
          <Card>
            {newRequests.slice(0, 5).map(r => <RequestRow key={r.id} r={r} client={clientName(data, r.clientId)} />)}
          </Card>
        </section>
      )}

      {dues.length > 0 && (
        <section>
          <SectionTitle right={<span className="text-xs tabular-nums text-muted-foreground">{inr(duesTotal)} pending</span>}><span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Payments due</span></SectionTitle>
          <Card>
            {dues.slice(0, 6).map(({ c, due }) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                <Link href={`/clients/${c.id}`} className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-amber">{inr(due)} pending this cycle</p>
                </Link>
                {c.phone && <a href={whatsappLink(c.phone, `Hi ${c.contactName || ''}, gentle reminder: ${inr(due)} is pending for this month's work with ${data.settings.companyName}. Please share the payment update. Thank you!`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 hover:bg-muted shrink-0"><MessageCircle className="h-3 w-3" /> Remind</a>}
              </div>
            ))}
          </Card>
        </section>
      )}

      {stuck.length > 0 && (
        <section>
          <SectionTitle right={<Link href="/content" className="text-xs text-muted-foreground hover:text-foreground">Pipeline</Link>}><span className="inline-flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5" /> Stuck in pipeline</span></SectionTitle>
          <Card>
            {stuck.slice(0, 6).map(i => (
              <Link key={i.id} href="/content" className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{i.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{[clientName(data, i.clientId), i.assignee || 'Unassigned'].join(' · ')}</p>
                </div>
                <span className="text-xs text-amber shrink-0 capitalize">{stageDays(i)}d in {i.stage}</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {load.length > 0 && (
        <section>
          <SectionTitle><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Team load</span></SectionTitle>
          <Card>
            {load.slice(0, 6).map(({ m, open, overdue: od }) => (
              <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <span className="text-xs text-muted-foreground shrink-0">{open} open{od > 0 && <span className="text-red"> · {od} overdue</span>}{open >= 8 && <span className="text-amber"> · heavy</span>}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionTitle right={<span className="text-xs text-muted-foreground">Paced across each client&apos;s own month</span>}>Monthly delivery</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          {active
            .slice()
            .sort((a, b) => pendency(b).gap - pendency(a).gap)
            .map(c => {
              const pace = pendency(c);
              const gap = pace.gap;
              return (
                <Link key={c.id} href={`/clients/${c.id}`}>
                  <Card className="p-4 hover:border-foreground/20 transition-colors h-full">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <span className={`text-sm tabular-nums shrink-0 ${gap > 1 ? 'text-red' : 'text-muted-foreground'}`}>{c.videosPosted}<span className="text-muted-foreground">/{c.videosPromised}</span></span>
                    </div>
                    <ProgressBar value={c.videosPosted} max={c.videosPromised} tone={c.health} />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <HealthBadge health={c.health} />
                      <span>{gap > 0 ? `${gap} behind` : gap === 0 ? 'On pace' : `${-gap} ahead`} · Cycle {formatDay(pace.cycle.start)}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          {active.length === 0 && <EmptyState title="No active clients" hint="Add your first client to start tracking delivery." action={<Button size="sm" variant="primary" onClick={() => router.push('/clients')}>Add client</Button>} />}
        </div>
      </section>

      {quiet.length > 0 && (
        <section>
          <SectionTitle><span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Gone quiet</span></SectionTitle>
          <Card>
            {quiet.slice(0, 5).map(c => (
              <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.owner}</p>
                </div>
                <span className="text-xs text-amber shrink-0">{daysSince(c.lastActivityAt)} days quiet</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <QuickSheet kind={quick} onClose={() => setQuick(null)} />
    </div>
  );
}

function TaskRow({ task, client, onDone }: { task: Task; client?: string; onDone: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
      <button onClick={onDone} aria-label="Mark done" className="h-6 w-6 rounded-full border-2 border-foreground/30 hover:border-green hover:bg-green-soft shrink-0 flex items-center justify-center group">
        <CheckCircle2 className="h-4 w-4 text-green opacity-0 group-hover:opacity-100" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">{[client, task.assignee, task.due && `due ${fmtDate(task.due)}`].filter(Boolean).join(' · ')}</p>
      </div>
      <PriorityBadge priority={task.priority} />
    </div>
  );
}

function RequestRow({ r, client }: { r: RequestItem; client?: string }) {
  return (
    <Link href="/requests" className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{r.body}</p>
        <p className="text-xs text-muted-foreground truncate">{client} · {r.channel} · {fmtDate(r.receivedAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
      </div>
      <span className="text-[11px] text-amber shrink-0">New</span>
    </Link>
  );
}

function QuickSheet({ kind, onClose }: { kind: 'task' | 'request' | null; onClose: () => void }) {
  const data = useStore();
  const toast = useToast();
  const [task, setTask] = useState({ title: '', clientId: '', assignee: '', priority: 'P2' as const, due: today() });
  const [req, setReq] = useState({ clientId: '', body: '', channel: 'whatsapp' as const, loggedBy: '', priority: 'P2' as const });

  const members = data.team.map(m => m.name);
  const clients = data.clients.filter(c => c.status !== 'Churned');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      d.tasks.unshift({ id: uid(), title: task.title.trim(), clientId: task.clientId || undefined, assignee: task.assignee || members[0] || '', priority: task.priority, due: task.due, status: 'todo', createdAt: new Date().toISOString() });
      if (task.clientId) { touch(d, task.clientId); }
    });
    toast('Task added');
    setTask({ title: '', clientId: '', assignee: '', priority: 'P2', due: today() });
    onClose();
  };

  const addRequest = (e: React.FormEvent) => {
    e.preventDefault();
    update(d => {
      d.requests.unshift({ id: uid(), clientId: req.clientId, body: req.body.trim(), channel: req.channel, receivedAt: new Date().toISOString(), loggedBy: req.loggedBy || members[0] || '', status: 'new', priority: req.priority });
      touch(d, req.clientId);
    });
    toast('Request logged');
    setReq({ clientId: '', body: '', channel: 'whatsapp', loggedBy: '', priority: 'P2' });
    onClose();
  };

  return (
    <>
      <Sheet open={kind === 'task'} onClose={onClose} title="New task" footer={<><Button onClick={onClose}>Cancel</Button><Button form="quick-task" type="submit" variant="primary">Add task</Button></>}>
        <form id="quick-task" onSubmit={addTask} className="space-y-3">
          <Field label="Task"><Input required autoFocus value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} placeholder="What needs doing?" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <Select value={task.clientId} onChange={e => setTask({ ...task, clientId: e.target.value })}>
                <option value="">Internal</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Assign to">
              <Select value={task.assignee} onChange={e => setTask({ ...task, assignee: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={task.priority} onChange={e => setTask({ ...task, priority: e.target.value as typeof task.priority })}>
                <option value="P1">P1 · Urgent</option><option value="P2">P2 · Normal</option><option value="P3">P3 · Low</option>
              </Select>
            </Field>
            <Field label="Due"><Input type="date" required value={task.due} onChange={e => setTask({ ...task, due: e.target.value })} /></Field>
          </div>
        </form>
      </Sheet>

      <Sheet open={kind === 'request'} onClose={onClose} title="Log a request" footer={<><Button onClick={onClose}>Cancel</Button><Button form="quick-req" type="submit" variant="primary">Log request</Button></>}>
        <form id="quick-req" onSubmit={addRequest} className="space-y-3">
          <Field label="Client">
            <Select required value={req.clientId} onChange={e => setReq({ ...req, clientId: e.target.value })}>
              <option value="">Select client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="What did they ask?"><Textarea required value={req.body} onChange={e => setReq({ ...req, body: e.target.value })} placeholder="In their words, briefly" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Channel">
              <Select value={req.channel} onChange={e => setReq({ ...req, channel: e.target.value as typeof req.channel })}>
                <option value="whatsapp">WhatsApp</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Logged by">
              <Select value={req.loggedBy} onChange={e => setReq({ ...req, loggedBy: e.target.value })}>
                <option value="">—</option>
                {members.map(n => <option key={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={req.priority} onChange={e => setReq({ ...req, priority: e.target.value as typeof req.priority })}>
                <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option>
              </Select>
            </Field>
          </div>
        </form>
      </Sheet>
    </>
  );
}
