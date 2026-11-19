'use client';

import { useState, type ReactNode } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useRole, ROLE_LABEL, ROLE_BLURB, unlockRole, ownerNeedsFirstPin, switchAccount } from '@/lib/role';
import { type Role } from '@/lib/store';
import { useCloud } from '@/lib/sync';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/components/toast';
import { OrbitMark } from '@/components/orbit-mark';
import { cn } from '@/lib/utils';

/**
 * Blocks the app until a role PIN unlocks this tab.
 * Cloud access key (if any) is checked first by CloudGate.
 */
export function RoleGate({ children }: { children: ReactNode }) {
  const { unlocked } = useRole();
  if (unlocked) return <>{children}</>;
  return <RoleUnlockScreen />;
}

function RoleUnlockScreen() {
  const toast = useToast();
  const cloud = useCloud();
  const [picked, setPicked] = useState<Role | null>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [needSet, setNeedSet] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const choose = (r: Role) => {
    setPicked(r);
    setPin('');
    setPin2('');
    setErr('');
    // Set-new-PIN is Owner-only first bootstrap — never for Manager/Team,
    // and never when an Owner PIN already exists (or may exist remotely).
    setNeedSet(r === 'owner' && ownerNeedsFirstPin());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked || busy) return;
    // Hard stop: Team/Manager unlock never enters set-PIN UI.
    const allowSet = picked === 'owner' && needSet && ownerNeedsFirstPin();
    setBusy(true);
    setErr('');
    try {
      const res = await unlockRole(picked, pin, allowSet ? pin2 : undefined);
      if (res === 'ok') {
        toast(`${ROLE_LABEL[picked]} unlocked`);
        return;
      }
      if (res === 'set-pin-required') {
        // Only escalate to set-PIN for genuine Owner first-time bootstrap.
        if (picked === 'owner' && ownerNeedsFirstPin()) {
          setNeedSet(true);
          setErr('Choose an Owner PIN (at least 4 digits), then confirm it.');
        } else {
          setNeedSet(false);
          setErr('Wrong PIN');
        }
        return;
      }
      if (res === 'locked') {
        setErr('Too many tries. Wait 15 minutes.');
        return;
      }
      if (res === 'pin-required') {
        setErr(allowSet ? 'PIN must be at least 4 digits.' : 'Enter the PIN for this role.');
        return;
      }
      setErr(allowSet && pin !== pin2 ? 'The two PINs do not match.' : 'Wrong PIN');
    } finally {
      setBusy(false);
    }
  };

  const leaveAccount = () => {
    switchAccount();
    toast('Enter the team access key');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-card">
            <OrbitMark className="h-8 w-8 text-foreground" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Unlock Orbit Ops</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every role needs its PIN before you can open the app on this device.</p>
          </div>
        </div>

        <div className="space-y-2">
          {(['owner', 'manager', 'team'] as Role[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => choose(r)}
              className={cn(
                'w-full flex items-center justify-between rounded-2xl border p-4 text-left text-sm transition-colors',
                picked === r ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
              )}
            >
              <div>
                <p className="font-medium">{ROLE_LABEL[r]}</p>
                <p className={cn('text-xs mt-0.5', picked === r ? 'text-background/70' : 'text-muted-foreground')}>{ROLE_BLURB[r]}</p>
              </div>
              <Lock className={cn('h-4 w-4 shrink-0', picked === r ? 'opacity-80' : 'text-muted-foreground')} />
            </button>
          ))}
        </div>

        {picked && (
          <form onSubmit={submit} className="rounded-2xl border bg-card p-4 space-y-3 shadow-card">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">
                  {needSet && picked === 'owner' ? 'Set Owner PIN' : `${ROLE_LABEL[picked]} PIN`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {needSet && picked === 'owner'
                    ? 'No Owner PIN yet. Create one to unlock Owner on this device.'
                    : `Enter the PIN to use the ${ROLE_LABEL[picked]} view.`}
                </p>
              </div>
            </div>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder={needSet && picked === 'owner' ? 'New PIN (4+ digits)' : 'PIN'}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }}
              className="h-11 text-center tracking-[0.35em]"
            />
            {needSet && picked === 'owner' && (
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirm PIN"
                value={pin2}
                onChange={e => { setPin2(e.target.value.replace(/\D/g, '')); setErr(''); }}
                className="h-11 text-center tracking-[0.35em]"
              />
            )}
            {err && <p role="alert" className="text-xs text-red">{err}</p>}
            <Button type="submit" variant="primary" className="w-full h-11" disabled={busy}>
              {busy ? 'Checking…' : `Unlock ${ROLE_LABEL[picked]}`}
            </Button>
          </form>
        )}

        {cloud.mode === 'remote' && (
          <div className="text-center">
            <button
              type="button"
              onClick={leaveAccount}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Switch Account
            </button>
            <p className="mt-1 text-[11px] text-muted-foreground">Leaves this team session and returns to the access-key sign-in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
