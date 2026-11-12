'use client';

import { useRef, useState } from 'react';
import { useStore, update, exportJSON, replaceAll, resetToSeed } from '@/lib/store';
import { useRole } from '@/lib/role';

export default function SettingsPage() {
  const data = useStore();
  const { role } = useRole();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [company, setCompany] = useState<string | null>(null);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Backup downloaded');
  };

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.clients)) throw new Error('bad');
      if (!confirm(`Restore ${parsed.clients.length} clients, ${(parsed.tasks || []).length} tasks, ${(parsed.requests || []).length} requests, ${(parsed.content || []).length} content items? Current data will be replaced.`)) return;
      replaceAll(parsed);
      flash('Backup restored');
    } catch {
      alert('This file is not a valid Orbit Ops backup.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return alert('PIN must be at least 4 digits.');
    if (pin !== pin2) return alert('PINs do not match.');
    update(d => { d.settings.ownerPin = pin; });
    setPin(''); setPin2('');
    flash('Owner PIN saved');
  };

  const removePin = () => {
    if (!confirm('Remove the Owner PIN? Anyone will be able to switch to Owner and see payments.')) return;
    update(d => { delete d.settings.ownerPin; });
    flash('Owner PIN removed');
  };

  const counts = {
    clients: data.clients.length,
    tasks: data.tasks.length,
    requests: data.requests.length,
    content: data.content.length,
    team: data.team.length,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Data, access and company details</p>
      </header>

      {msg && <div className="rounded-lg bg-foreground text-background text-sm px-4 py-2">{msg}</div>}

      <section className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-medium">Backup & restore</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data lives in this browser only. Download a backup regularly and keep it in Drive. Restore it on another phone or laptop to move your data there.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted px-2 py-2">
              <p className="text-lg font-semibold tabular-nums">{v}</p>
              <p className="text-muted-foreground capitalize">{k}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">Download backup</button>
          <button onClick={() => fileRef.current?.click()} className="border px-4 py-2 rounded-lg text-sm">Restore from file</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-medium">Owner PIN</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payments, expenses and revenue are visible only in the Owner role. Set a PIN so switching to Owner needs it.
            {data.settings.ownerPin ? ' A PIN is currently set.' : ' No PIN set — anyone can switch to Owner.'}
          </p>
        </div>
        {role === 'owner' ? (
          <form onSubmit={savePin} className="flex flex-wrap gap-2 items-center">
            <input type="password" inputMode="numeric" placeholder="New PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className="border rounded-lg px-3 py-2 text-sm w-32" />
            <input type="password" inputMode="numeric" placeholder="Repeat PIN" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} className="border rounded-lg px-3 py-2 text-sm w-32" />
            <button type="submit" className="bg-foreground text-background px-4 py-2 rounded-lg text-sm">{data.settings.ownerPin ? 'Change PIN' : 'Set PIN'}</button>
            {data.settings.ownerPin && <button type="button" onClick={removePin} className="text-sm underline text-muted-foreground">Remove PIN</button>}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Switch to the Owner role to change the PIN.</p>
        )}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Company</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={company ?? data.settings.companyName} onChange={e => setCompany(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" />
          <button onClick={() => { update(d => { d.settings.companyName = (company ?? d.settings.companyName).trim() || d.settings.companyName; }); setCompany(null); flash('Saved'); }} className="border px-4 py-2 rounded-lg text-sm">Save</button>
        </div>
        <p className="text-xs text-muted-foreground">Orbitcore · Orai, Uttar Pradesh · orbitcore.in</p>
      </section>

      {role === 'owner' && (
        <section className="rounded-xl border border-red/30 p-4 space-y-2">
          <h2 className="font-medium text-red">Danger zone</h2>
          <p className="text-sm text-muted-foreground">Wipe everything in this browser and start again with the demo clients. Download a backup first.</p>
          <button onClick={() => { if (confirm('Reset ALL data in this browser? This cannot be undone.')) { resetToSeed(); flash('Data reset'); } }} className="border border-red text-red px-4 py-2 rounded-lg text-sm">Reset all data</button>
        </section>
      )}
    </div>
  );
}
