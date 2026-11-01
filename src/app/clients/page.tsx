'use client';

import Link from "next/link";

const CLIENTS = [
  {
    id: "1",
    name: "Mahindra Dhruvtara",
    status: "Active",
    package: "12 videos / month",
    progress: "7 of 12",
    lastActivity: "2 days ago",
    health: "amber" as const,
    owner: "Ram Soni",
  },
  {
    id: "2",
    name: "Sparkle Makeover",
    status: "Active",
    package: "8 videos / month",
    progress: "5 of 8",
    lastActivity: "1 day ago",
    health: "green" as const,
    owner: "Tanvi",
  },
  {
    id: "3",
    name: "Havells Galaxy",
    status: "Active",
    package: "12 videos / month",
    progress: "4 of 12",
    lastActivity: "5 days ago",
    health: "red" as const,
    owner: "Vikas Rathore",
  },
  {
    id: "4",
    name: "Hindustan Motors",
    status: "Onboarding",
    package: "8 videos / month",
    progress: "0 of 8",
    lastActivity: "Today",
    health: "green" as const,
    owner: "Ram Soni",
  },
];

export default function ClientsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">12 active · health at a glance</p>
        </div>
        <button className="rounded-lg bg-foreground text-background px-4 py-2 text-sm">
          + Client
        </button>
      </header>

      <div className="space-y-3">
        {CLIENTS.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="block rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      c.health === "red" ? "bg-red" : c.health === "amber" ? "bg-amber" : "bg-green"
                    }`}
                  />
                  <h3 className="font-medium truncate">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {c.package} · {c.owner}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs">
                  <span>{c.progress} posted</span>
                  <span>Last: {c.lastActivity}</span>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border">{c.status}</span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground"
                style={{
                  width: c.progress.includes("of")
                    ? `${(parseInt(c.progress.split(" ")[0]) / parseInt(c.progress.split(" ")[2])) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
