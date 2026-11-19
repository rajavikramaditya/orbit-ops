'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Inbox, Film, CheckSquare, BookOpen, IndianRupee, UserCircle, Settings, MoreHorizontal, Lock, KeyRound, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, ROLE_LABEL } from '@/lib/role';
import { useStore } from '@/lib/store';
import { useCloud } from '@/lib/sync';
import { Sheet } from '@/components/ui';
import { useToast } from '@/components/toast';
import { OrbitMark } from '@/components/orbit-mark';

type Item = { href: string; label: string; icon: typeof Home; ownerOnly?: boolean };

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Work',
    items: [
      { href: '/today', label: 'Today', icon: Home },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/requests', label: 'Requests', icon: Inbox },
      { href: '/content', label: 'Content', icon: Film },
      { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'Business',
    items: [
      { href: '/revenue', label: 'Revenue', icon: IndianRupee, ownerOnly: true },
      { href: '/team', label: 'Team', icon: UserCircle },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/readme', label: 'Readme', icon: BookOpen },
    ],
  },
];

const mobilePrimary = ['/today', '/clients', '/requests', '/content', '/tasks'];

function useBadges() {
  const data = useStore();
  return {
    '/requests': data.requests.filter(r => r.status === 'new').length,
    '/tasks': data.tasks.filter(t => t.status !== 'done' && t.due && t.due < new Date().toISOString().slice(0, 10)).length,
  } as Record<string, number>;
}

export function Nav() {
  const pathname = usePathname();
  const { role, isOwner, unlocked, leaveToLogin, switchAccount } = useRole();
  const cloud = useCloud();
  const toast = useToast();
  const [more, setMore] = useState(false);
  const badges = useBadges();

  const allItems = groups.flatMap(g => g.items);
  const visible = (i: Item) => !i.ownerOnly || isOwner;
  const primary = mobilePrimary.map(h => allItems.find(i => i.href === h)!);
  const secondary = allItems.filter(i => !mobilePrimary.includes(i.href) && visible(i));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const canSwitchAccount = cloud.mode === 'remote';

  /** Switch Role returns to the original access-key Sign-in (not RoleGate). */
  const onSwitchRole = () => {
    leaveToLogin();
    toast(canSwitchAccount ? 'Enter the team access key' : 'Enter a PIN to continue');
  };

  const onSwitchAccount = () => {
    switchAccount();
    toast('Enter the team access key');
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/90 backdrop-blur sticky top-0 z-40">
        <Link href="/today" className="flex items-center gap-2.5">
          <OrbitMark className="h-8 w-8 text-foreground" />
          <p className="font-semibold text-sm leading-none tracking-tight">Orbit Ops</p>
        </Link>
        {unlocked && (
          <button
            type="button"
            onClick={onSwitchRole}
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card px-2.5 py-1.5 text-xs hover:bg-muted"
          >
            <span className={cn('h-2 w-2 rounded-full', role === 'owner' ? 'bg-green' : role === 'manager' ? 'bg-amber' : 'bg-muted-foreground')} />
            <span>{ROLE_LABEL[role]}</span>
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card p-4 sticky top-0 h-screen">
        <Link href="/today" className="mb-7 flex items-center gap-3 px-1 pt-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background shadow-card">
            <OrbitMark className="h-6 w-6 text-foreground" />
          </span>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight leading-none">Orbit Ops</h1>
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">by Orbitcore</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {groups.map(g => {
            const items = g.items.filter(visible);
            if (!items.length) return null;
            return (
              <div key={g.title}>
                <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{g.title}</p>
                <div className="space-y-0.5">
                  {items.map(l => (
                    <Link key={l.href} href={l.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors', isActive(l.href) ? 'bg-foreground text-background font-medium shadow-card' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                      <l.icon className={cn('h-4 w-4', isActive(l.href) && 'text-brand')} />
                      <span className="flex-1">{l.label}</span>
                      {badges[l.href] > 0 && <span className={cn('text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-medium', isActive(l.href) ? 'bg-background/20' : 'bg-muted')}>{badges[l.href]}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 text-sm">
            <span className={cn('h-2 w-2 rounded-full', role === 'owner' ? 'bg-green' : role === 'manager' ? 'bg-amber' : 'bg-muted-foreground')} />
            <span className="text-muted-foreground">Signed in as </span>
            <span className="font-medium">{ROLE_LABEL[role]}</span>
          </div>
          <button
            type="button"
            onClick={onSwitchRole}
            className="w-full flex items-center justify-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Switch Role
          </button>
          {canSwitchAccount && (
            <button
              type="button"
              onClick={onSwitchAccount}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Switch Account
            </button>
          )}
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t bg-card/95 backdrop-blur md:hidden safe-area-inset-bottom">
        {primary.map(l => (
          <Link key={l.href} href={l.href} className={cn('relative flex flex-1 flex-col items-center justify-center py-2 text-[10px] min-h-[56px]', isActive(l.href) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <l.icon className="h-5 w-5 mb-0.5" />
            {l.label}
            {badges[l.href] > 0 && <span className="absolute top-1.5 right-1/2 translate-x-4 h-4 min-w-4 px-1 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center tabular-nums">{badges[l.href]}</span>}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className={cn('flex flex-1 flex-col items-center justify-center py-2 text-[10px] min-h-[56px]', secondary.some(i => isActive(i.href)) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          <MoreHorizontal className="h-5 w-5 mb-0.5" />
          More
        </button>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {secondary.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMore(false)} className={cn('flex items-center gap-3 rounded-2xl border p-4 text-sm', isActive(l.href) ? 'bg-foreground text-background' : 'bg-card hover:bg-muted')}>
              <l.icon className="h-5 w-5" />
              {l.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setMore(false); onSwitchRole(); }}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium hover:bg-muted"
        >
          <Lock className="h-4 w-4" />
          Switch Role
        </button>
        {canSwitchAccount && (
          <button
            type="button"
            onClick={() => { setMore(false); onSwitchAccount(); }}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <KeyRound className="h-4 w-4" />
            Switch Account
          </button>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{ROLE_LABEL[role]}</span>.
          {' '}Switch Role returns to the team access-key sign-in, then a role PIN unlock.
        </p>
      </Sheet>
    </>
  );
}
