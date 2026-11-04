'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, type Client } from '@/lib/store';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBin, setShowBin] = useState(false);
  const [form, setForm] = useState({ name: '', package: '8 videos / month', videosPromised: 8, owner: 'Tanvi', industry: '', city: 'Orai', notes: '' });

  useEffect(() => {
    setClients(loadData().clients);
  }, []);

  const activeClients = clients.filter(c => c.status !== 'Churned');
  const churnedClients = clients.filter(c => c.status === 'Churned');
  const list = showBin ? churnedClients : activeClients;

  const addClient = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const newClient: Client = {
      id: Date.now().toString(),
      name: form.name,
      status: 'Active',
      package: form.package,
      videosPromised: form.videosPromised,
      videosPosted: 0,
      lastActivityAt: new Date().toISOString(),
      health: 'green',
      owner: form.owner,
      industry: form.industry,
      city: form.city,
      notes: form.notes,
      onboardedOn: new Date().toISOString().slice(0, 10),
    };
    data.clients.unshift(newClient);
    saveData(data);
    setClients(data.clients);
    setShowForm(false);
    setForm({ name: '', package: '8 videos / month', videosPromised: 8, owner: 'Tanvi', industry: '', city: 'Orai', notes: '' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">{activeClients.length} active · {churnedClients.length} in bin</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBin(!showBin)} className="text-sm px-3 py-2 border rounded-lg">
            {showBin ? 'Hide bin' : 'Bin'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-foreground text-background px-4 py-3 text-sm">
            {showForm ? 'Cancel' : '+ Client'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={addClient} className="rounded-lg border p-4 space-y-3">
          <input required placeholder="Client name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select value={form.package} onChange={e => setForm({ ...form, package: e.target.value, videosPromised: e.target.value.includes('12') ? 12 : 8 })} className="border rounded-lg px-3 py-2">
              <option>8 videos / month</option>
              <option>12 videos / month</option>
              <option>Custom</option>
            </select>
            <input placeholder="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input placeholder="Industry" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
          <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Save Client</button>
        </form>
      )}

      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">{showBin ? 'Bin is empty.' : 'No active clients.'}</p>}
        {list.map((c) => {
          const received = (c.payments || []).reduce((s, p) => s + p.amount, 0);
          const spent = (c.expenses || []).reduce((s, e) => s + e.amount, 0);
          return (
            <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-lg border bg-background p-4 hover:bg-muted/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{c.name}</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.health === 'red' ? 'bg-red-100 text-red-700' : c.health === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.health === 'red' ? 'bg-red-600' : c.health === 'amber' ? 'bg-amber-600' : 'bg-green-600'}`} />
                      {c.health === 'red' ? 'At risk' : c.health === 'amber' ? 'Watch' : 'On track'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{c.package} · {c.owner}</p>
                  <div className="mt-1 flex gap-4 text-xs">
                    <span className="text-green-700">Received ₹{received.toLocaleString('en-IN')}</span>
                    <span className="text-red-700">Spent ₹{spent.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded border text-muted-foreground">{c.status}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">Since {new Date(c.onboardedOn).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="mt-3 h-0.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-foreground/40" style={{ width: `${(c.videosPosted / c.videosPromised) * 100}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
