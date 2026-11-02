"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Clapperboard,
  FileBarChart,
  Home,
  Inbox,
  IndianRupee,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Permission } from "@/lib/rbac";
import { unreadNotifications } from "@/lib/selectors";
import { cn } from "@/components/ui";
import { QuickAdd } from "@/components/QuickAdd";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCentre } from "@/components/NotificationCentre";
import { UserSwitcher } from "@/components/UserSwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  permission?: Permission;
  mobile?: boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Home, mobile: true },
  { href: "/clients", label: "Clients", icon: Users, mobile: true },
  { href: "/requests", label: "Requests", icon: Inbox, permission: "view_requests" },
  { href: "/content", label: "Content", icon: Clapperboard, mobile: true },
  { href: "/shoots", label: "Shoots", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, mobile: true },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/sales", label: "Sales", icon: Target, permission: "view_sales" },
  { href: "/money", label: "Money", icon: IndianRupee, permission: "view_money" },
  { href: "/team", label: "Team", icon: UserRound, permission: "view_team" },
  { href: "/reports", label: "Reports", icon: FileBarChart, permission: "view_reports" },
  { href: "/audit", label: "Audit log", icon: ShieldCheck, permission: "view_audit" },
  { href: "/trash", label: "Trash", icon: Trash2, permission: "view_trash" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "manage_settings" },
];


function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition min-h-[44px]", active ? "font-semibold" : "muted hover:text-[var(--fg)] hover:soft")} style={active ? { background: "var(--bg-soft)" } : undefined}>
            <Icon size={18} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const store = useStore();
  const [quickOpen, setQuickOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isPortal = pathname.startsWith("/portal") || pathname.startsWith("/print");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (isPortal) return <>{children}</>;

  const visibleNav = NAV.filter((n) => !n.permission || store.can(n.permission));
  const unread = unreadNotifications(store.state, store.currentUser.id).length;

  return (
    <div className="min-h-dvh flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r px-3 py-5 sticky top-0 h-dvh" style={{ background: "var(--bg-elev)" }}>
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks items={visibleNav} pathname={pathname} />
        </div>
        <div className="pt-4 border-t">
          <UserSwitcher />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}>
          <div className="flex items-center gap-2 px-3 sm:px-5 h-14">
            <button className="lg:hidden rounded-lg p-2.5 hover:soft" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="flex-1" />
            <button onClick={() => setSearchOpen(true)} className="btn btn-ghost btn-sm hidden sm:inline-flex min-w-[220px] justify-start muted" aria-label="Global search">
              <Search size={15} /> Search clients, content, tasks… <kbd className="ml-auto text-[10px] border rounded px-1">⌘K</kbd>
            </button>
            <button onClick={() => setSearchOpen(true)} className="sm:hidden rounded-lg p-2.5 hover:soft" aria-label="Search">
              <Search size={20} />
            </button>
            <button onClick={() => setNotifOpen(true)} className="relative rounded-lg p-2.5 hover:soft" aria-label="Notifications">
              <Bell size={20} />
              {unread > 0 && <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-semibold flex items-center justify-center">{unread}</span>}
            </button>
            <button onClick={store.toggleTheme} className="rounded-lg p-2.5 hover:soft" aria-label="Toggle theme">
              {store.state.theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setQuickOpen(true)} className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Plus size={16} /> Quick add
            </button>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-5 lg:px-8 py-5 pb-28 lg:pb-10 max-w-[1400px] w-full mx-auto fade-in" key={pathname}>
          {store.hydrated ? children : <LoadingSkeleton />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t safe-bottom" style={{ background: "var(--bg-elev)" }}>
          <div className="grid grid-cols-5 items-end px-1 pt-1">
            {visibleNav
              .filter((n) => n.mobile)
              .slice(0, 4)
              .map((n, idx) => {
                const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
                const Icon = n.icon;
                const el = (
                  <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-1.5 text-[11px] min-h-[52px] justify-center", active ? "font-semibold" : "muted")}>
                    <Icon size={20} />
                    {n.label}
                  </Link>
                );
                if (idx === 2) {
                  return (
                    <React.Fragment key="frag">
                      <button onClick={() => setQuickOpen(true)} className="flex flex-col items-center justify-center -mt-5" aria-label="Quick add">
                        <span className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                          <Plus size={26} />
                        </span>
                      </button>
                      {el}
                    </React.Fragment>
                  );
                }
                return el;
              })}
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 p-4 overflow-y-auto fade-in" style={{ background: "var(--bg-elev)" }}>
            <Brand />
            <div className="mt-5">
              <NavLinks items={visibleNav} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-5 pt-4 border-t">
              <UserSwitcher />
            </div>
          </aside>
        </div>
      )}

      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationCentre open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span
        aria-hidden
        className="h-8 w-8 shrink-0"
        style={{ background: "var(--fg)", WebkitMaskImage: "url(/logo.svg)", maskImage: "url(/logo.svg)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }}
      />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-semibold">Orbit Ops</span>
          <span className="block text-[11px] muted">Orbit Media by Orbitcore</span>
        </span>
      )}
      {compact && <span className="text-sm font-semibold">Orbit Media by Orbitcore</span>}
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg soft" />
      <div className="h-32 rounded-2xl soft" />
      <div className="h-32 rounded-2xl soft" />
    </div>
  );
}

export { ClipboardList };
