'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { loadData, saveData, touchClient, type Client } from '@/lib/store';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});

  useEffect(() => {
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      setClient(c);
      setForm(c);
    }
  }, [id]);

  const save = () => {
    if (!client) return;
    const data = loadData();
    const idx = data.clients.findIndex((x: Client) => x.id === id);
    if (idx >= 0) {
      data.clients[idx] = { ...data.clients[idx], ...form } as Client;
      saveData(data);
      touchClient(id);
      setClient(data.clients[idx]);
      setEditing(false);
    }
  };

  const updateProgress = (posted: number) => {
    if (!client) return;
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      c.videosPosted = Math.max(0, Math.min(posted, c.videosPromised));
      c.lastActivityAt = new Date().toISOString();
      saveData(data);
      setClient({ ...c });
    }
  };

  if (!client) return <div className="max-w-3xl mx-auto">Loading…</div>;

  const healthColor = client.health === 'red' ? 'bg-red' : client.health === 'amber' ? 'bg-amber' : 'bg-green';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${healthColor}`} />
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{client.industry} · {client.city} · {client.owner}</p>
        </div>
        <button onClick={() => setEditing(!editing)} className="text-sm px-3 py-1 border rounded-lg">
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </header>

      {editing ? (
        <div className="space-y-3 rounded-xl border p-4">
          <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.package || ''} onChange={e => setForm({ ...form, package: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input type="number" value={form.videosPromised || 0} onChange={e => setForm({ ...form, videosPromised: +e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <input value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
          <button onClick={save} className="bg-green text-white px-4 py-2 rounded-lg text-sm">Save changes</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Package</p>
              <p className="font-medium mt-1">{client.package}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">This cycle</p>
              <p className="font-medium mt-1">{client.videosPosted} of {client.videosPromised}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground">Last activity</p>
              <p className="font-medium mt-1">{new Date(client.lastActivityAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cycle progress</span>
              <span>{client.videosPosted} / {client.videosPromised}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-foreground" style={{ width: `${(client.videosPosted / client.videosPromised) * 100}%` }} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateProgress(client.videosPosted - 1)} className="px-3 py-1 border rounded text-sm">−</button>
              <button onClick={() => updateProgress(client.videosPosted + 1)} className="px-3 py-1 border rounded text-sm">+</button>
            </div>
          </div>

          <section className="rounded-xl border p-4">
            <h2 className="text-sm font-medium mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground">{client.notes || 'No notes yet.'}</p>
          </section>
        </>
      )}
    </div>
  );
}
