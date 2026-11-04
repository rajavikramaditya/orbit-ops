'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Users, Inbox, Film, CheckSquare, BookOpen, IndianRupee, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/role";

const links = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/revenue", label: "Revenue", icon: IndianRupee },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/content", label: "Content", icon: Film },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/team", label: "Team", icon: UserCircle },
  { href: "/readme", label: "Readme", icon: BookOpen },
];

export function Nav() {
  const pathname = usePathname();
  const { role, setRole } = useRole();

  return (
    <>
      <header className="md:hidden flex items-center gap-3 border-b border-border px-4 py-3 bg-background sticky top-0 z-40">
        <div className="h-12 w-12 flex items-center justify-center shrink-0">
          <Image src="/logo.svg" alt="Orbit Media" width={44} height={44} className="object-contain" priority />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none">Orbit Ops</p>
          <p className="text-[10px] text-muted-foreground">Orbit Media by Orbitcore</p>
        </div>
      </header>

      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-muted/40 p-4">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center">
            <Image src="/logo.svg" alt="Orbit Media" width={44} height={44} className="object-contain" priority />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight leading-none">Orbit Ops</h1>
            <p className="text-xs text-muted-foreground">Orbit Media by Orbitcore</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", pathname === l.href ? "bg-foreground text-background" : "hover:bg-muted")}>
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 text-xs">
          <p className="text-muted-foreground mb-1">Role</p>
          <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full border rounded px-2 py-1 text-sm">
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="team">Team</option>
          </select>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background/95 backdrop-blur md:hidden safe-area-inset-bottom">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={cn("flex flex-1 flex-col items-center justify-center py-3 text-[11px] min-h-[60px]", pathname === l.href ? "text-foreground font-medium" : "text-muted-foreground")}>
            <l.icon className="h-5 w-5 mb-0.5" />
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
