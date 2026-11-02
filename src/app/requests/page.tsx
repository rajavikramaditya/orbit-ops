'use client';

import { useEffect, useState } from 'react';
import { loadData, saveData, touchClient, type RequestItem, type Client } from '@/lib/store';

export default function RequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ clientId: '', body: '', channel: 'call' as const, loggedBy: 'Tanvi' });

  const refresh = () => {
    const data = loadData();
    setRequests(data.requests);
    setClients(data.clients);
  };

  useEffect(() => { refresh(); }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const item: RequestItem = {
      id: Date.now().toString(),
      clientId: form.clientId,
      body: form.body,
      channel: form.channel,
      receivedAt: new Date().toISOString(),
      loggedBy: form.loggedBy,
      status: 'new',
    };
    data.requests.unshift(item);
    saveData(data);
    touchClient(form.clientId);
    setShow(false);
    setForm({ clientId: '', body: '', channel: 'call', loggedBy: 'Tanvi' });
    refresh();
  };

  const triage = (id: string, status: RequestItem['status'], assignee?: string) => {
    const data = loadData();
    const r = data.requests.find((x: RequestItem) => x.id === id);
    if (r) {
      r.status = status;
      if (assignee) r.assignee = assignee;
    }
    saveData(data);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Requests</h1>
          <p className="text-sm text-muted-foreground">Every call and WhatsApp logged here first</p>
        </div>
        <button onClick={() => setShow(!show)} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">
          {show ? 'Cancel' : '+ Request'}
        </button>
      </header>

      {show && (
        <form onSubmit={add} className="rounded-xl border p-4 space-y-3">
          <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea required placeholder="What did they ask?" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as any })} className="border rounded-lg px-3 py-2">
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
            <input value={form.loggedBy} onChange={e => setForm({ ...form, loggedBy: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <button type="submit" className="bg-green text-white px-4 py-2 rounded-lg text-sm">Log Request</button>
        </form>
      )}

      <div className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
        {requests.map(r => {
          const client = clients.find(c => c.id === r.clientId);
          return (
            <div key={r.id} className="rounded-xl border p-4">
              <div className="flex justify-between">
                <p className="font-medium">{client?.name || 'Unknown'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'new' ? 'bg-amber text-white' : 'border'}`}>{r.status}</span>
              </div>
              <p className="text-sm mt-1">{r.body}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.channel} · {r.loggedBy} · {new Date(r.receivedAt).toLocaleString('en-IN')}</p>
              {r.status === 'new' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => triage(r.id, 'triaged', 'Shahil')} className="text-xs px-3 py-1 border rounded">Assign to Shahil</button>
                  <button onClick={() => triage(r.id, 'done')} className="text-xs px-3 py-1 bg-green text-white rounded">Mark done</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
