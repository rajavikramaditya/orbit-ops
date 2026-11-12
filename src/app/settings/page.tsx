'use client';

import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, Building2, TriangleAlert } from 'lucide-react';
import { useStore, update, exportJSON, replaceAll, resetToSeed } from '@/lib/store';
import { useRole } from '@/lib/role';
import { useToast } from '@/components/toast';
import { PageHeader, Card, Button, Field, Input, SectionTitle } from '@/components/ui';

export default function SettingsPage() {
  const data = useStore();
  const { isOwner } = useRole();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [company, setCompany] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  };

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.clients)) throw new Error('bad');
      const summary = `${parsed.clients.length} clients, ${(parsed.tasks || []).length} tasks, ${(parsed.requests || []).length} requests and ${(parsed.content || []).length} content items`;
      if (!confirm(`Restore ${summary}? Everything currently in this browser will be replaced.`)) return;
      replaceAll(parsed);
      toast('Backup restored');
    } catch {
      alert('This file is not a valid Orbit Ops backup.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return alert('PIN must be at least 4 digits.');
    if (pin !== pin2) return alert('The two PINs do not match.');
    update(d => { d.settings.ownerPin = pin; });
    setPin(''); setPin2('');
    toast('Owner PIN saved');
  };

  const counts = [
    ['Clients', data.clients.length],
    ['Tasks', data.tasks.length],
    ['Requests', data.requests.length],
    ['Content', data.content.length],
    ['Team', data.team.length],
  ] as const;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Settings" subtitle="Data, access and company details" />

      <Card className="p-5 space-y-4">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Backup & restore</span></SectionTitle>
        <p className="text-sm text-muted-foreground -mt-2">Data lives in this browser only. Download a backup regularly and keep it in Drive. Restore that file on another phone or laptop to move your data there.</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          {counts.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-muted px-2 py-2.5">
              <p className="text-lg font-semibold tabular-nums">{v}</p>
              <p className="text-[11px] text-muted-foreground">{k}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={download}><Download className="h-4 w-4" /> Download backup</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Restore from file</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Owner PIN</span></SectionTitle>
        <p className="text-sm text-muted-foreground -mt-2">
          Payments, expenses and revenue are visible only to the Owner role. A PIN makes switching to Owner require it.
          {data.settings.ownerPin ? ' A PIN is currently set.' : ' No PIN is set, so anyone using this device can switch to Owner.'}
        </p>
        {isOwner ? (
          <form onSubmit={savePin} className="flex flex-wrap gap-2 items-end">
            <Field label="New PIN" className="w-36"><Input type="password" inputMode="numeric" autoComplete="off" placeholder="At least 4 digits" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Repeat" className="w-36"><Input type="password" inputMode="numeric" autoComplete="off" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))} /></Field>
            <Button type="submit" variant="primary">{data.settings.ownerPin ? 'Change PIN' : 'Set PIN'}</Button>
            {data.settings.ownerPin && <Button variant="ghost" type="button" onClick={() => { if (confirm('Remove the Owner PIN? Anyone will be able to switch to Owner and see payments.')) { update(d => { delete d.settings.ownerPin; }); toast('PIN removed'); } }}>Remove</Button>}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Switch to the Owner role to change the PIN.</p>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</span></SectionTitle>
        <div className="flex flex-wrap gap-2 items-end">
          <Field label="Name shown in the app" className="flex-1 min-w-56">
            <Input value={company ?? data.settings.companyName} onChange={e => setCompany(e.target.value)} />
          </Field>
          <Button onClick={() => { update(d => { d.settings.companyName = (company ?? d.settings.companyName).trim() || d.settings.companyName; }); setCompany(null); toast('Saved'); }}>Save</Button>
        </div>
        <p className="text-xs text-muted-foreground">Orbitcore · Orai, Uttar Pradesh · orbitcore.in</p>
      </Card>

      {isOwner && (
        <Card className="p-5 space-y-3 border-red/30">
          <SectionTitle><span className="inline-flex items-center gap-1.5 text-red"><TriangleAlert className="h-3.5 w-3.5" /> Danger zone</span></SectionTitle>
          <p className="text-sm text-muted-foreground -mt-1">Erase everything in this browser and start again with the demo clients. Download a backup first.</p>
          <Button variant="danger" onClick={() => { if (confirm('Reset ALL data in this browser? This cannot be undone.')) { resetToSeed(); toast('Data reset'); } }}>Reset all data</Button>
        </Card>
      )}
    </div>
  );
}
