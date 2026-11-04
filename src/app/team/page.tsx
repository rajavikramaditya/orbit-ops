'use client';

import { useEffect, useState } from 'react';

type Member = { id: string; name: string; role: string; focus: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'Editor', focus: '' });

  useEffect(() => {
    const raw = localStorage.getItem('orbit-ops-team');
    if (raw) setMembers(JSON.parse(raw));
    else {
      const seed: Member[] = [
        { id: '1', name: 'Vikram', role: 'Owner', focus: 'Strategy, clients, revenue' },
        { id: '2', name: 'Ram Soni', role: 'Manager', focus: 'Automotive clients' },
        { id: '3', name: 'Tanvi', role: 'Manager', focus: 'Beauty, education, design' },
        { id: '4', name: 'Shahil', role: 'Manager', focus: 'Automotive, events' },
      ];
      setMembers(seed);
      localStorage.setItem('orbit-ops-team', JSON.stringify(seed));
    }
  }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const next = [{ id: Date.now().toString(), ...form }, ...members];
    setMembers(next);
    localStorage.setItem('orbit-ops-team', JSON.stringify(next));
    setShow(false);
    setForm({ name: '', role: 'Editor', focus: '' });
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
        <form onSubmit={add} className="rounded-xl border bg-card p-4 space-y-3">
          <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full border rounded-lg px-3 py-2">
            <option>Owner</option>
            <option>Manager</option>
            <option>Editor</option>
            <option>Shooter</option>
            <option>Designer</option>
          </select>
          <input placeholder="Focus / clients" value={form.focus} onChange={e => setForm({ ...form, focus: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {members.map(m => (
          <div key={m.id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
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
