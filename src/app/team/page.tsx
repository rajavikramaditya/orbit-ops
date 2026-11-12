'use client';

import { useState } from 'react';
import { useStore, update, uid, type Member, type MemberRole } from '@/lib/store';

const ROLES: MemberRole[] = ['Owner', 'Manager', 'Editor', 'Shooter', 'Designer'];

export default function TeamPage() {
  const data = useStore();
  const members = data.team;
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Editor' as MemberRole, focus: '', phone: '' });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const m: Member = { id: uid(), name: form.name.trim(), role: form.role, focus: form.focus.trim(), phone: form.phone.trim() || undefined };
    update(d => { d.team.push(m); });
    setShow(false);
    setForm({ name: '', role: 'Editor', focus: '', phone: '' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} people</p>
        </div>
        <button onClick={() => setShow(!show)} className="rounded-lg bg-foreground text-background px-4 py-2 text-sm">
          {show ? 'Cancel' : '+ Member'}
        </button>
      </header>

      {show && (
        <form onSubmit={add} className="rounded-xl border p-4 space-y-3">
          <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as MemberRole })} className="border rounded-lg px-3 py-2">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <input placeholder="Focus / clients" value={form.focus} onChange={e => setForm({ ...form, focus: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-muted-foreground">{m.focus}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded border text-muted-foreground">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
