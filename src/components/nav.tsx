'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Users, Inbox, Film, CheckSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/content", label: "Content", icon: Film },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar with logo */}
      <header className="md:hidden flex items-center gap-3 border-b border-border px-4 py-3 bg-background sticky top-0 z-40">
        <div className="h-9 w-9 flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Orbit Media"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">Orbit Ops</p>
          <p className="text-[10px] text-muted-foreground">Orbit Media by Orbitcore</p>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-muted/40 p-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Orbit Media"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">Orbit Ops</h1>
            <p className="text-xs text-muted-foreground">Orbit Media by Orbitcore</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === l.href
                  ? "bg-foreground text-background"
                  : "hover:bg-muted"
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background md:hidden">
        {links.slice(0, 5).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-2 text-[10px]",
              pathname === l.href ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            <l.icon className="h-5 w-5" />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
