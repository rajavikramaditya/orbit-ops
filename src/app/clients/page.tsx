'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadData, saveData, type Client } from '@/lib/store';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', package: '8 videos / month', videosPromised: 8, owner: 'Tanvi', industry: '', city: 'Orai', notes: '' });

  useEffect(() => {
    setClients(loadData().clients);
  }, []);

  const addClient = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const newClient: Client = {
      id: Date.now().toString(),
      name: form.name,
      status: 'Onboarding',
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
          <p className="text-sm text-muted-foreground">{clients.length} clients</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-foreground text-background px-4 py-3 text-sm w-full sm:w-auto">
          {showForm ? 'Cancel' : '+ Client'}
        </button>
      </header>

      {showForm && (
        <form onSubmit={addClient} className="rounded-xl border p-4 space-y-3">
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
          <button type="submit" className="bg-green text-white px-4 py-2 rounded-lg text-sm">Save Client</button>
        </form>
      )}

      <div className="space-y-3">
        {clients.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-xl border bg-background p-4 shadow-sm hover:shadow active:bg-muted/50 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${c.health === 'red' ? 'bg-red' : c.health === 'amber' ? 'bg-amber' : 'bg-green'}`} />
                  <h3 className="font-medium truncate">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">{c.package} · {c.owner}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="font-medium">{c.videosPosted} of {c.videosPromised}</span>
                  <span className="text-muted-foreground">posted</span>
                  <span className="text-muted-foreground">·</span>
                  <span>Last {new Date(c.lastActivityAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${c.status === 'Active' ? 'bg-green/10 text-green' : c.status === 'Onboarding' ? 'bg-amber/10 text-amber' : 'border'}`}>
                {c.status}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${c.health === 'red' ? 'bg-red' : c.health === 'amber' ? 'bg-amber' : 'bg-green'}`} style={{ width: `${(c.videosPosted / c.videosPromised) * 100}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
