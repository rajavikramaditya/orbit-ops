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

  const exportCSV = () => {
    const rows = [['Name', 'Status', 'Package', 'Owner', 'Onboarded', 'Monthly Fee', 'Received', 'Spent']];
    activeClients.forEach(c => {
      const received = (c.payments || []).reduce((s, p) => s + p.amount, 0);
      const spent = (c.expenses || []).reduce((s, e) => s + e.amount, 0);
      rows.push([c.name, c.status, c.package, c.owner, c.onboardedOn, String(c.monthlyFee || ''), String(received), String(spent)]);
    });
    const csv = rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbit-ops-clients.csv';
    a.click();
  };

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
          <p className="text-sm text-muted-foreground">{activeClients.length} active</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="text-sm px-3 py-2 border rounded-lg">Export CSV</button>
          <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-foreground text-background px-4 py-3 text-sm">
            {showForm ? 'Cancel' : '+ Client'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={addClient} className="rounded-xl border p-4 space-y-3">
          <input required placeholder="Client name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Package" value={form.package} onChange={e => setForm({ ...form, package: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input type="number" placeholder="Videos / month" value={form.videosPromised} onChange={e => setForm({ ...form, videosPromised: +e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <input placeholder="Industry" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={2} />
          <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Save Client</button>
        </form>
      )}

      <div className="flex gap-2 text-sm">
        <button onClick={() => setShowBin(false)} className={!showBin ? 'font-medium' : 'text-muted-foreground'}>Active</button>
        <button onClick={() => setShowBin(true)} className={showBin ? 'font-medium' : 'text-muted-foreground'}>Bin ({churnedClients.length})</button>
      </div>

      <div className="space-y-2">
        {list.map(c => {
          const received = (c.payments || []).reduce((s, p) => s + p.amount, 0);
          const spent = (c.expenses || []).reduce((s, e) => s + e.amount, 0);
          return (
            <Link key={c.id} href={`/clients/${c.id}`} className="block rounded-xl border p-4 hover:bg-muted/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.package} · {c.owner}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-700">₹{received.toLocaleString('en-IN')}</p>
                  <p className="text-red-700">₹{spent.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
