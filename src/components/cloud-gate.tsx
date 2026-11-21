'use client';

import { useEffect, useState } from 'react';
import { connectCloud, migrateBrowser, saveAccessKey, useCloud } from '@/lib/sync';
import { useRole, ROLE_LABEL, unlockWithIdentity, ownerNeedsFirstPin } from '@/lib/role';
import { type Role } from '@/lib/store';
import { useToast } from '@/components/toast';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, ShieldCheck, LayoutDashboard, Wallet, Film } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { OrbitMark } from '@/components/orbit-mark';
import { cn } from '@/lib/utils';

/**
 * The one login page for Orbit Ops.
 * When the workspace needs a team access key, that field sits on this same form
 * with role + first name + password — no separate RoleGate middle step.
 */
export function CloudGate({ children }: { children: React.ReactNode }) {
  const cloud = useCloud();
  const { unlocked } = useRole();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => { void connectCloud(); }, []);

  const migrate = async () => {
    setBusy(true);
    const result = await migrateBrowser();
    setBusy(false);
    if (result === 'ok') toast('Saved to the database');
    else if (result === 'payments-kept') toast('Work is saved. Set an Owner PIN, then save again so payments can be stored.');
    else toast('Could not reach the database');
  };

  // Avoid flashing the app (or a blank middle page) while we still do not
  // know whether this deployment needs the access-key sign-in.
  if (cloud.mode === 'unknown') {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Opening Orbit Ops…</p>
        </div>
      </div>
    );
  }

  const needsLogin = cloud.mode === 'locked' || !unlocked;

  if (needsLogin) {
    return <UnifiedLogin needAccessKey={cloud.mode === 'locked'} />;
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

function UnifiedLogin({ needAccessKey }: { needAccessKey: boolean }) {
  const toast = useToast();
  const cloud = useCloud();
  const [accessKey, setAccessKey] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [needSet, setNeedSet] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Recompute setup affordance when cloud connects or remote settings arrive.
  // Never stick needSet=true from a pre-connect Owner click (stale / unknown Neon).
  useEffect(() => {
    if (role !== 'owner') {
      setNeedSet(false);
      return;
    }
    const shouldSet = ownerNeedsFirstPin();
    setNeedSet(shouldSet);
    if (!shouldSet) setPassword2('');
  }, [role, cloud.mode]);

  const chooseRole = (r: Role) => {
    setRole(r);
    setError('');
    setNeedSet(r === 'owner' && ownerNeedsFirstPin());
    setPassword('');
    setPassword2('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || busy) return;
    setBusy(true);
    setError('');
    try {
      if (needAccessKey) {
        const key = accessKey.trim();
        if (key.length < 8) {
          setError('Enter the team access key.');
          return;
        }
        const ok = await saveAccessKey(key);
        if (ok === 'unreachable') {
          setError('The database did not answer. Records stay closed.');
          return;
        }
        if (ok !== 'ok') {
          setError('That key was refused.');
          return;
        }
      }

      // Only Owner first-PIN bootstrap may send a confirm value — and only once
      // the Confirm field has actually been shown (needSet). After connecting
      // against an unset remote pin, pass undefined so we get set-pin-required
      // instead of treating an empty password2 as a failed confirm.
      const allowSet = role === 'owner' && ownerNeedsFirstPin();
      if (!allowSet && needSet) setNeedSet(false);
      const res = await unlockWithIdentity(
        role,
        firstName,
        password,
        allowSet && needSet ? password2 : undefined,
      );
      if (res === 'ok') {
        toast(`Signed in as ${ROLE_LABEL[role]}`);
        return;
      }
      if (res === 'name-required') {
        setError('Enter your first name.');
        return;
      }
      if (res === 'unknown-name') {
        setError(`No ${ROLE_LABEL[role]} on the team matches that first name.`);
        return;
      }
      if (res === 'ambiguous-name') {
        setError(`More than one ${ROLE_LABEL[role]} shares that first name. Rename one on the Team page.`);
        return;
      }
      if (res === 'set-pin-required') {
        if (role === 'owner' && ownerNeedsFirstPin()) {
          setNeedSet(true);
          setError('Choose an Owner password (at least 4 characters), then confirm it.');
        } else {
          setNeedSet(false);
          setError('Wrong password');
        }
        return;
      }
      if (res === 'locked') {
        setError('Too many tries. Wait 15 minutes.');
        return;
      }
      if (res === 'pin-required') {
        setError(allowSet ? 'Password must be at least 4 characters.' : 'Enter your password.');
        return;
      }
      setError(allowSet && password !== password2 ? 'The two passwords do not match.' : 'Wrong name or password.');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !!role
    && firstName.trim().length > 0
    && password.trim().length > 0
    && (!needAccessKey || accessKey.trim().length >= 8)
    && (!needSet || password2.trim().length > 0);

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
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to Orbit Ops</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {needAccessKey
                ? 'Enter the team access key, choose your role, then your first name and password.'
                : 'Choose your role, then enter your first name and password.'}
            </p>

            {needAccessKey && (
              <div className="mt-7">
                <label htmlFor="access-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">Team access key</label>
                <div className="relative">
                  <Input
                    id="access-key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={accessKey}
                    onChange={e => { setAccessKey(e.target.value); setError(''); }}
                    placeholder="Enter access key"
                    className="h-11 pr-11"
                    aria-invalid={!!error}
                  />
                  <button type="button" onClick={() => setShowKey(v => !v)} aria-label={showKey ? 'Hide key' : 'Show key'} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className={needAccessKey ? 'mt-5' : 'mt-7'}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Role</p>
              <div className="grid grid-cols-3 gap-2">
                {(['owner', 'manager', 'team'] as Role[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => chooseRole(r)}
                    className={cn(
                      'rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors',
                      role === r ? 'bg-foreground text-background' : 'bg-card hover:bg-muted',
                    )}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="first-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">First name</label>
              <Input
                id="first-name"
                autoComplete="given-name"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setError(''); }}
                placeholder="e.g. Vikram"
                className="h-11"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {needSet && role === 'owner' ? 'New Owner password' : 'Password'}
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="off"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder={needSet && role === 'owner' ? 'At least 4 characters' : 'Password'}
                  className="h-11 pr-11"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {needSet && role === 'owner' && (
              <div className="mt-3">
                <label htmlFor="login-password-2" className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
                <Input
                  id="login-password-2"
                  type="password"
                  autoComplete="off"
                  value={password2}
                  onChange={e => { setPassword2(e.target.value); setError(''); }}
                  placeholder="Repeat password"
                  className="h-11"
                />
              </div>
            )}

            {error && <p role="alert" className="mt-3 text-sm text-red">{error}</p>}

            <Button type="submit" variant="primary" disabled={busy || !canSubmit} className="mt-5 h-11 w-full text-[15px]">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </Button>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-muted px-3.5 py-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <p>
                {needAccessKey
                  ? 'Payments and revenue stay behind the Owner password, even after you sign in.'
                  : cloud.mode === 'remote'
                    ? 'Workspace connected. Sign in with your role, first name and password.'
                    : 'This device is running without a shared database.'}
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">Authorised team members only · <a href="https://orbitcore.in" target="_blank" rel="noreferrer" className="hover:text-foreground">orbitcore.in</a></p>
      </div>
    </div>
  );
}

const POINTS = [
  { icon: LayoutDashboard, title: 'One daily picture', text: 'What is due today and which client is slipping, before the day starts.' },
  { icon: Film, title: 'Delivery you can promise', text: 'Every video tracked from idea to posted, paced across each client\u2019s own month.' },
  { icon: Wallet, title: 'Money, kept private', text: 'Collections and profit per client stay locked until the right person signs in.' },
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
