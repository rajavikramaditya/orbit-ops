'use client';

import { useEffect, useState } from 'react';
import { connectCloud, migrateBrowser, saveAccessKey, useCloud } from '@/lib/sync';
import { useToast } from '@/components/toast';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, LayoutDashboard, Wallet, Film } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { OrbitMark } from '@/components/orbit-mark';

export function CloudGate({ children }: { children: React.ReactNode }) {
  const cloud = useCloud();
  const toast = useToast();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void connectCloud(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok = await saveAccessKey(key);
    setBusy(false);
    if (ok === 'unreachable') setError('The database did not answer. Records stay closed.');
    else if (ok !== 'ok') setError('That key was refused.');
    else setKey('');
  };

  const migrate = async () => {
    setBusy(true);
    const result = await migrateBrowser();
    setBusy(false);
    if (result === 'ok') toast('Saved to the database');
    else if (result === 'payments-kept') toast('Work is saved. Set an Owner PIN, then save again so payments can be stored.');
    else toast('Could not reach the database');
  };

  if (cloud.mode === 'locked') {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
        <BrandPanel />
        <div className="flex min-h-full flex-col px-6 py-8 sm:px-10">
          <div className="flex items-center gap-2.5 lg:hidden">
            <OrbitMark className="h-8 w-8 text-foreground" />
            <span className="text-base font-semibold tracking-tight">Orbit Ops</span>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <form onSubmit={submit} className="w-full max-w-sm">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-card shadow-card">
                <Lock className="h-5 w-5" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Enter the team access key to open Orbit Ops on this device.</p>

              <div className="mt-7">
                <label htmlFor="access-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">Team access key</label>
                <div className="relative">
                  <Input
                    id="access-key"
                    type={show ? 'text' : 'password'}
                    autoFocus
                    autoComplete="current-password"
                    value={key}
                    onChange={e => { setKey(e.target.value); setError(''); }}
                    placeholder="Enter access key"
                    className="h-11 pr-11"
                    aria-invalid={!!error}
                  />
                  <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide key' : 'Show key'} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && <p role="alert" className="mt-2 text-sm text-red">{error}</p>}
              </div>

              <Button type="submit" variant="primary" disabled={busy || key.trim().length < 8} className="mt-5 h-11 w-full text-[15px]">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying</> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>

              <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-muted px-3.5 py-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                <p>Payments and revenue stay behind a separate Owner PIN, even after you sign in.</p>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground">Authorised team members only · <a href="https://orbitcore.in" target="_blank" rel="noreferrer" className="hover:text-foreground">orbitcore.in</a></p>
        </div>
      </div>
    );
  }

  return (
    <>
      {cloud.migrate && cloud.mode === 'remote' && (
        <div className="border-b bg-card px-4 py-3 flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="text-sm">This browser has records that are not in the database yet.</p>
            <Button size="sm" variant="primary" disabled={busy} onClick={migrate}>Save to database</Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

const POINTS = [
  { icon: LayoutDashboard, title: 'One daily picture', text: 'What is due today and which client is slipping, before the day starts.' },
  { icon: Film, title: 'Delivery you can promise', text: 'Every video tracked from idea to posted, paced across each client\u2019s own month.' },
  { icon: Wallet, title: 'Money, kept private', text: 'Collections and profit per client, visible to the Owner only.' },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0a0a0a] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <svg className="pointer-events-none absolute -right-40 -top-40 h-[640px] w-[640px] text-white/[0.07]" viewBox="0 0 600 600" fill="none" aria-hidden="true">
        {[120, 190, 260, 330, 400].map(r => <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeWidth="1" />)}
        <circle cx="300" cy="170" r="7" fill="#E3651F" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(227,101,31,0.16),transparent_55%)]" />

      <div className="relative flex items-center gap-3">
        <OrbitMark className="h-9 w-9 text-white" />
        <span className="text-lg font-semibold tracking-tight">Orbit Ops</span>
      </div>

      <div className="relative max-w-lg">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Operations platform</p>
        <h2 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">Every client. Every deadline. One operating picture.</h2>
        <ul className="mt-10 space-y-5">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/55">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/45">Built by Orbitcore · Orai, Uttar Pradesh · orbitcore.in</p>
    </aside>
  );
}
