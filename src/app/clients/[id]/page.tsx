'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { loadData, saveData, touchClient, type Client, type Payment, type Expense } from '@/lib/store';
import { useRole } from '@/lib/role';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { role } = useRole();
  const [client, setClient] = useState<Client | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [pendingStatus, setPendingStatus] = useState<Client['status'] | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', date: '', note: '' });
  const [expForm, setExpForm] = useState({ amount: '', date: '', category: 'Ads', note: '' });

  const refresh = () => {
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      setClient(c);
      setForm(c);
    }
  };

  useEffect(() => { refresh(); }, [id]);

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

  const setStatus = (status: Client['status']) => {
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      c.status = status;
      c.lastActivityAt = new Date().toISOString();
      c.activity = [{ id: Date.now().toString(), clientId: id, text: `Status changed to ${status}`, at: new Date().toISOString() }, ...(c.activity || [])];
      saveData(data);
      setClient({ ...c });
    }
  };

  const applyStatus = () => {
    if (!pendingStatus) return;
    setStatus(pendingStatus);
    setPendingStatus(null);
  };

  const addPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      const p: Payment = { id: Date.now().toString(), amount: +payForm.amount, date: payForm.date, note: payForm.note };
      c.payments = [p, ...(c.payments || [])];
      c.activity = [{ id: Date.now().toString(), clientId: id, text: `Payment of ₹${p.amount.toLocaleString('en-IN')} recorded`, at: new Date().toISOString() }, ...(c.activity || [])];
      saveData(data);
      setClient({ ...c });
      setShowPayment(false);
      setPayForm({ amount: '', date: '', note: '' });
    }
  };

  const addExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c) {
      const exp: Expense = { id: Date.now().toString(), amount: +expForm.amount, date: expForm.date, category: expForm.category, note: expForm.note };
      c.expenses = [exp, ...(c.expenses || [])];
      saveData(data);
      setClient({ ...c });
      setShowExpense(false);
      setExpForm({ amount: '', date: '', category: 'Ads', note: '' });
    }
  };

  const updatePayment = (pid: string, updates: Partial<Payment>) => {
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c && c.payments) {
      const p = c.payments.find((x: Payment) => x.id === pid);
      if (p) Object.assign(p, updates);
      saveData(data);
      setClient({ ...c });
      setEditingPayment(null);
    }
  };

  const updateExpense = (eid: string, updates: Partial<Expense>) => {
    const data = loadData();
    const c = data.clients.find((x: Client) => x.id === id);
    if (c && c.expenses) {
      const e = c.expenses.find((x: Expense) => x.id === eid);
      if (e) Object.assign(e, updates);
      saveData(data);
      setClient({ ...c });
      setEditingExpense(null);
    }
  };

  if (!client) return <div className="max-w-3xl mx-auto">Loading…</div>;

  const totalReceived = (client.payments || []).reduce((s: number, p: Payment) => s + p.amount, 0);
  const totalSpent = (client.expenses || []).reduce((s: number, e: Expense) => s + e.amount, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{client.industry} · {client.city} · {client.owner}</p>
        </div>
        <div className="text-right">
          <span className="text-xs px-2 py-0.5 rounded border">{client.status}</span>
          <button onClick={() => setEditing(!editing)} className="block text-sm mt-2 underline">{editing ? 'Cancel' : 'Edit'}</button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Move to</span>
        <select value={pendingStatus || client.status} onChange={e => setPendingStatus(e.target.value as Client['status'])} className="text-sm border rounded px-2 py-1">
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
          <option value="Churned">Churned (move to bin)</option>
        </select>
        {pendingStatus && pendingStatus !== client.status && (
          <button onClick={applyStatus} className="text-xs px-3 py-1 bg-foreground text-background rounded">Apply</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 rounded-lg border p-4">
          <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.package || ''} onChange={e => setForm({ ...form, package: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input type="number" value={form.videosPromised || 0} onChange={e => setForm({ ...form, videosPromised: +e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <input value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <input type="number" placeholder="Monthly fee (₹)" value={form.monthlyFee || ''} onChange={e => setForm({ ...form, monthlyFee: +e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <input type="date" value={form.onboardedOn || ''} onChange={e => setForm({ ...form, onboardedOn: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2" rows={3} />
          <button onClick={save} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Save changes</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Package</p>
              <p className="font-medium mt-1">{client.package}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">This cycle</p>
              <p className="font-medium mt-1">{client.videosPosted} / {client.videosPromised}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Onboarded</p>
              <p className="font-medium mt-1">{new Date(client.onboardedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Monthly fee</p>
              <p className="font-medium mt-1">{client.monthlyFee ? `₹${client.monthlyFee.toLocaleString('en-IN')}` : '—'}</p>
            </div>
          </div>
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-medium mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground">{client.notes || 'No notes yet.'}</p>
          </section>
        </>
      )}

      {role === 'owner' && (
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Payments received (Admin)</h2>
          <button onClick={() => setShowPayment(!showPayment)} className="text-xs px-3 py-1 border rounded">{showPayment ? 'Cancel' : '+ Payment'}</button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Total received: ₹{totalReceived.toLocaleString('en-IN')}</p>
        {showPayment && (
          <form onSubmit={addPayment} className="space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" placeholder="Amount (₹)" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input required type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <input placeholder="Note" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Add</button>
          </form>
        )}
        <div className="space-y-2">
          {(client.payments || []).length === 0 && <p className="text-xs text-muted-foreground">No payments yet.</p>}
          {(client.payments || []).map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b pb-1">
              {editingPayment === p.id ? (
                <div className="flex gap-2 flex-1 items-center">
                  <input type="number" defaultValue={p.amount} id={`pamt-${p.id}`} className="w-24 border rounded px-2 py-1 text-sm" />
                  <input type="date" defaultValue={p.date} id={`pdate-${p.id}`} className="border rounded px-2 py-1 text-sm" />
                  <input defaultValue={p.note || ''} id={`pnote-${p.id}`} className="flex-1 border rounded px-2 py-1 text-sm" />
                  <button onClick={() => {
                    const amt = (document.getElementById(`pamt-${p.id}`) as HTMLInputElement).value;
                    const dt = (document.getElementById(`pdate-${p.id}`) as HTMLInputElement).value;
                    const nt = (document.getElementById(`pnote-${p.id}`) as HTMLInputElement).value;
                    updatePayment(p.id, { amount: +amt, date: dt, note: nt });
                  }} className="text-xs px-2 py-1 bg-foreground text-background rounded">Save</button>
                  <button onClick={() => setEditingPayment(null)} className="text-xs underline">Cancel</button>
                </div>
              ) : (
                <>
                  <span>₹{p.amount.toLocaleString('en-IN')} · {p.note || 'Payment'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{p.date}</span>
                    <button onClick={() => setEditingPayment(p.id)} className="text-xs underline">Edit</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {role === 'owner' && (
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Expenses (Admin)</h2>
          <button onClick={() => setShowExpense(!showExpense)} className="text-xs px-3 py-1 border rounded">{showExpense ? 'Cancel' : '+ Expense'}</button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Total spent: ₹{totalSpent.toLocaleString('en-IN')}</p>
        {showExpense && (
          <form onSubmit={addExpense} className="space-y-2 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" placeholder="Amount (₹)" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              <input required type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <select value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option>Ads</option><option>Shoot</option><option>Editing</option><option>Travel</option><option>Other</option>
            </select>
            <input placeholder="Note" value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Add</button>
          </form>
        )}
        <div className="space-y-2">
          {(client.expenses || []).length === 0 && <p className="text-xs text-muted-foreground">No expenses yet.</p>}
          {(client.expenses || []).map(e => (
            <div key={e.id} className="flex items-center justify-between text-sm border-b pb-1">
              {editingExpense === e.id ? (
                <div className="flex gap-2 flex-1 items-center">
                  <input type="number" defaultValue={e.amount} id={`eamt-${e.id}`} className="w-24 border rounded px-2 py-1 text-sm" />
                  <input type="date" defaultValue={e.date} id={`edate-${e.id}`} className="border rounded px-2 py-1 text-sm" />
                  <input defaultValue={e.note || ''} id={`enote-${e.id}`} className="flex-1 border rounded px-2 py-1 text-sm" />
                  <button onClick={() => {
                    const amt = (document.getElementById(`eamt-${e.id}`) as HTMLInputElement).value;
                    const dt = (document.getElementById(`edate-${e.id}`) as HTMLInputElement).value;
                    const nt = (document.getElementById(`enote-${e.id}`) as HTMLInputElement).value;
                    updateExpense(e.id, { amount: +amt, date: dt, note: nt });
                  }} className="text-xs px-2 py-1 bg-foreground text-background rounded">Save</button>
                  <button onClick={() => setEditingExpense(null)} className="text-xs underline">Cancel</button>
                </div>
              ) : (
                <>
                  <span>₹{e.amount.toLocaleString('en-IN')} · {e.category} {e.note ? `· ${e.note}` : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{e.date}</span>
                    <button onClick={() => setEditingExpense(e.id)} className="text-xs underline">Edit</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium mb-3">Activity</h2>
        <div className="space-y-2 text-sm">
          {(client.activity || []).length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
          {(client.activity || []).slice(0, 10).map(a => (
            <div key={a.id} className="flex justify-between text-muted-foreground">
              <span>{a.text}</span>
              <span className="text-xs">{new Date(a.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
