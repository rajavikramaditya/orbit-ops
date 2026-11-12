'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Users, Inbox, Film, CheckSquare, BookOpen, IndianRupee, UserCircle, Settings, MoreHorizontal, Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, ROLE_LABEL } from '@/lib/role';
import { useStore, type Role } from '@/lib/store';
import { Sheet, Button, Input } from '@/components/ui';
import { useToast } from '@/components/toast';

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
  const { role, isOwner } = useRole();
  const [more, setMore] = useState(false);
  const badges = useBadges();

  const allItems = groups.flatMap(g => g.items);
  const visible = (i: Item) => !i.ownerOnly || isOwner;
  const primary = mobilePrimary.map(h => allItems.find(i => i.href === h)!);
  const secondary = allItems.filter(i => !mobilePrimary.includes(i.href) && visible(i));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between gap-3 border-b px-4 py-2.5 bg-card/90 backdrop-blur sticky top-0 z-40">
        <Link href="/today" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Orbit Media" width={34} height={34} className="object-contain dark:invert" priority />
          <div>
            <p className="font-semibold text-sm leading-none">Orbit Ops</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Orbit Media by Orbitcore</p>
          </div>
        </Link>
        <RoleSwitcher compact />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card p-4 sticky top-0 h-screen">
        <Link href="/today" className="mb-6 flex items-center gap-3 px-1">
          <Image src="/logo.svg" alt="Orbit Media" width={40} height={40} className="object-contain dark:invert" priority />
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">Orbit Ops</h1>
            <p className="text-[11px] text-muted-foreground mt-1">Orbit Media by Orbitcore</p>
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
                    <Link key={l.href} href={l.href} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors', isActive(l.href) ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                      <l.icon className="h-4 w-4" />
                      <span className="flex-1">{l.label}</span>
                      {badges[l.href] > 0 && <span className={cn('text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-medium', isActive(l.href) ? 'bg-background/20' : 'bg-muted')}>{badges[l.href]}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="pt-4 border-t">
          <RoleSwitcher />
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
        <p className="text-[11px] text-muted-foreground">Signed in as <span className="font-medium text-foreground">{ROLE_LABEL[role]}</span>. Change role from the top bar.</p>
      </Sheet>
    </>
  );
}

function RoleSwitcher({ compact }: { compact?: boolean }) {
  const { role, switchRole } = useRole();
  const data = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const pick = (r: Role) => {
    const res = switchRole(r);
    if (res === 'ok') { setOpen(false); toast(`Role: ${ROLE_LABEL[r]}`); return; }
    setErr('');
    setPin('');
  };

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    const res = switchRole('owner', pin);
    if (res === 'ok') { setOpen(false); setPin(''); setErr(''); toast('Owner unlocked'); }
    else setErr('Wrong PIN');
  };

  const needsPin = !!data.settings.ownerPin && role !== 'owner';

  return (
    <>
      <button onClick={() => setOpen(true)} className={cn('flex items-center gap-2 rounded-xl border bg-card text-sm hover:bg-muted transition-colors', compact ? 'px-2.5 py-1.5 text-xs' : 'w-full px-3 py-2')}>
        <span className={cn('h-2 w-2 rounded-full', role === 'owner' ? 'bg-green' : role === 'manager' ? 'bg-amber' : 'bg-muted-foreground')} />
        <span className="flex-1 text-left">{ROLE_LABEL[role]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Who is using this device?">
        <div className="space-y-2">
          {(['owner', 'manager', 'team'] as Role[]).map(r => (
            <button key={r} onClick={() => pick(r)} className={cn('w-full flex items-center justify-between rounded-2xl border p-4 text-left text-sm', role === r ? 'bg-foreground text-background' : 'hover:bg-muted')}>
              <div>
                <p className="font-medium">{ROLE_LABEL[r]}</p>
                <p className={cn('text-xs mt-0.5', role === r ? 'text-background/70' : 'text-muted-foreground')}>
                  {r === 'owner' ? 'Everything, including payments, expenses and revenue' : r === 'manager' ? 'Clients, requests, content and tasks' : 'Assigned work only'}
                </p>
              </div>
              {r === 'owner' && needsPin && <Lock className="h-4 w-4 opacity-70" />}
            </button>
          ))}
        </div>
        {needsPin && (
          <form onSubmit={unlock} className="rounded-2xl bg-muted p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Enter the Owner PIN to unlock.</p>
            <div className="flex gap-2">
              <Input type="password" inputMode="numeric" autoComplete="off" placeholder="PIN" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} className="flex-1" />
              <Button type="submit" variant="primary">Unlock</Button>
            </div>
            {err && <p className="text-xs text-red">{err}</p>}
          </form>
        )}
      </Sheet>
    </>
  );
}
