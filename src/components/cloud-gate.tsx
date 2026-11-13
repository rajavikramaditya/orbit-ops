'use client';

import { useEffect, useState } from 'react';
import { connectCloud, migrateBrowser, saveAccessKey, useCloud } from '@/lib/sync';
import { useToast } from '@/components/toast';
import { Button, Field, Input } from '@/components/ui';

export function CloudGate({ children }: { children: React.ReactNode }) {
  const cloud = useCloud();
  const toast = useToast();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
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
        <div className="fixed inset-0 z-[80] bg-background/95 flex items-center justify-center p-4">
          <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-card p-6 space-y-4 shadow-card">
            <div>
              <h2 className="text-lg font-semibold">Orbit Ops</h2>
              <p className="text-sm text-muted-foreground mt-1">This browser needs the team access key before it can open records. Payments stay behind the Owner PIN.</p>
            </div>
            <Field label="Access key">
              <Input type="password" autoFocus autoComplete="current-password" value={key} onChange={e => setKey(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red">{error}</p>}
            <Button type="submit" variant="primary" disabled={busy || key.trim().length < 8} className="w-full">Continue</Button>
          </form>
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
