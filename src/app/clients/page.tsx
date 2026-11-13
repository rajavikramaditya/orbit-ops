'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Download } from 'lucide-react';
import { useStore, update, uid, sum, inr, pendency, cycleStartDayOf, clientCycle, clampCycleDay, formatDay, type Client, type Health } from '@/lib/store';
import { useRole } from '@/lib/role';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Input, Select, Field, Textarea, Segmented, HealthBadge, Avatar, ProgressBar, EmptyState, Sheet } from '@/components/ui';

type Filter = 'all' | 'watch' | 'risk' | 'bin';

const blank = { name: '', package: '8 videos / month', videosPromised: 8, owner: '', industry: '', city: 'Orai', notes: '', monthlyFee: '', phone: '', contactName: '', cycleStartDay: Math.min(new Date().getDate(), 28) };

export default function ClientsPage() {
  const data = useStore();
  const { isOwner } = useRole();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState('');
  const [sort, setSort] = useState<'attention' | 'name' | 'fee'>('attention');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);

  const owners = useMemo(() => [...new Set(data.clients.map(c => c.owner).filter(Boolean))].sort(), [data.clients]);
  const active = data.clients.filter(c => c.status !== 'Churned');
  const churned = data.clients.filter(c => c.status === 'Churned');
  const watchCount = active.filter(c => c.health === 'amber').length;
  const riskCount = active.filter(c => c.health === 'red').length;

  const list = useMemo(() => {
    const base = filter === 'bin' ? churned : active;
    const q = query.trim().toLowerCase();
    const filtered = base.filter(c => {
      if (filter === 'watch' && c.health !== 'amber') return false;
      if (filter === 'risk' && c.health !== 'red') return false;
      if (owner && c.owner !== owner) return false;
      if (q && ![c.name, c.owner, c.city, c.industry, c.phone].some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const rank: Record<Health, number> = { red: 0, amber: 1, green: 2 };
    return filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'fee') return (b.monthlyFee || 0) - (a.monthlyFee || 0);
      return pendency(b).gap - pendency(a).gap || rank[a.health] - rank[b.health] || a.name.localeCompare(b.name);
    });
  }, [active, churned, filter, query, owner, sort]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const c: Client = {
      id: uid(), name: form.name.trim(), status: 'Active', package: form.package, videosPromised: form.videosPromised || 8,
      videosPosted: 0, lastActivityAt: new Date().toISOString(), health: 'green', owner: form.owner.trim(),
      industry: form.industry.trim(), city: form.city.trim(), notes: form.notes.trim(),
      onboardedOn: new Date().toISOString().slice(0, 10), monthlyFee: form.monthlyFee ? +form.monthlyFee : undefined,
      phone: form.phone.trim() || undefined, contactName: form.contactName.trim() || undefined,
      cycleStartDay: clampCycleDay(form.cycleStartDay),
      cycleMonth: clientCycle(clampCycleDay(form.cycleStartDay)).key,
    };
    update(d => { d.clients.unshift(c); });
    toast(`${c.name} added`);
    setShow(false);
    setForm(blank);
  };

  const exportCSV = () => {
    const rows = [['Name', 'Status', 'Health', 'Package', 'Owner', 'City', 'Onboarded', 'Cycle starts', 'Behind', 'Monthly Fee', 'Posted', 'Promised', ...(isOwner ? ['Received', 'Spent'] : [])]];
    active.forEach(c => {
      const p = pendency(c);
      const base = [c.name, c.status, c.health, c.package, c.owner, c.city, c.onboardedOn, String(cycleStartDayOf(c)), String(p.gap), String(c.monthlyFee || ''), String(c.videosPosted), String(c.videosPromised)];
      rows.push(isOwner ? [...base, String(sum(c.payments)), String(sum(c.expenses))] : base);
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orbit-ops-clients.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Clients" subtitle={`${active.length} active · ${watchCount} to watch · ${riskCount} at risk`}
        actions={
          <>
            <Button size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5" /> CSV</Button>
            <Button size="sm" variant="primary" onClick={() => setShow(true)}><Plus className="h-3.5 w-3.5" /> Client</Button>
          </>
        }
      >
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: active.length },
            { value: 'watch', label: 'Watch', count: watchCount },
            { value: 'risk', label: 'At risk', count: riskCount },
            { value: 'bin', label: 'Bin', count: churned.length },
          ]}
        />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, owner, city…" className="pl-9" />
        </div>
        <Select value={owner} onChange={e => setOwner(e.target.value)} className="sm:w-44">
          <option value="">All owners</option>
          {owners.map(o => <option key={o}>{o}</option>)}
        </Select>
        <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="sm:w-44">
          <option value="attention">Needs attention</option>
          <option value="name">Name</option>
          <option value="fee">Monthly fee</option>
        </Select>
      </div>

      {list.length === 0 && (
        <EmptyState
          title={filter === 'bin' ? 'Bin is empty' : query ? 'No clients match' : 'No clients yet'}
          hint={filter === 'bin' ? 'Churned clients land here instead of disappearing.' : 'Add a client to start tracking their monthly delivery.'}
        />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {list.map(c => {
          const received = sum(c.payments);
          const spent = sum(c.expenses);
          const pace = pendency(c);
          const paceText = pace.gap > 0 ? `${pace.gap} behind` : pace.gap < 0 ? `${-pace.gap} ahead` : 'on pace';
          return (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="p-4 hover:border-foreground/20 transition-colors h-full">
                <div className="flex items-start gap-3">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{c.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.package} · {c.owner || 'Unassigned'}</p>
                  </div>
                  {filter === 'bin' ? <span className="text-[11px] text-muted-foreground">{c.status}</span> : <HealthBadge health={c.health} />}
                </div>
                {filter !== 'bin' && (
                  <>
                    <ProgressBar value={c.videosPosted} max={c.videosPromised} tone={c.health} className="mt-3" />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{c.videosPosted}/{c.videosPromised} · {paceText}</span>
                      <span>Cycle {formatDay(pace.cycle.start)}</span>
                    </div>
                  </>
                )}
                {isOwner && (received > 0 || spent > 0) && (
                  <div className="mt-2 flex gap-3 text-xs tabular-nums">
                    <span className="text-green">Received {inr(received)}</span>
                    <span className="text-red">Spent {inr(spent)}</span>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <Sheet open={show} onClose={() => setShow(false)} title="New client" footer={<><Button onClick={() => setShow(false)}>Cancel</Button><Button form="add-client" type="submit" variant="primary">Save client</Button></>}>
        <form id="add-client" onSubmit={add} className="space-y-3">
          <Field label="Client name"><Input required autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Business name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Package"><Input value={form.package} onChange={e => setForm({ ...form, package: e.target.value })} /></Field>
            <Field label="Videos / month"><Input type="number" min={1} value={form.videosPromised} onChange={e => setForm({ ...form, videosPromised: +e.target.value })} /></Field>
            <Field label="Month starts on"><Input type="number" min={1} max={28} required value={form.cycleStartDay} onChange={e => setForm({ ...form, cycleStartDay: +e.target.value })} /></Field>
            <Field label="Account owner">
              <Select value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}>
                <option value="">Unassigned</option>
                {data.team.map(m => <option key={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Monthly fee (₹)"><Input type="number" min={0} value={form.monthlyFee} onChange={e => setForm({ ...form, monthlyFee: e.target.value })} placeholder="0" /></Field>
            <Field label="Contact person"><Input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="City"><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="Industry"><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></Field>
          </div>
          <p className="text-[11px] text-muted-foreground">Work owed is counted from this date every month, not from the 1st. The same date shows on the card.</p>
          <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
        </form>
      </Sheet>
    </div>
  );
}
