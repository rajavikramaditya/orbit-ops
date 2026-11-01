'use client';

import { useState } from "react";

type PriorityItem = {
  id: string;
  client: string;
  task: string;
  assignee: string;
  due: string;
  score: number;
  reason: string;
  health: "green" | "amber" | "red";
};

const DEMO_TODAY: PriorityItem[] = [
  {
    id: "1",
    client: "Mahindra Dhruvtara",
    task: "Post 3 reels from last shoot",
    assignee: "Shahil",
    due: "Today",
    score: 185,
    reason: "Due today · client is amber",
    health: "amber",
  },
  {
    id: "2",
    client: "Havells Galaxy",
    task: "Edit 4 product videos",
    assignee: "Prathmes",
    due: "Overdue 2 days",
    score: 170,
    reason: "Overdue 2 days · behind schedule",
    health: "red",
  },
  {
    id: "3",
    client: "Sparkle Makeover",
    task: "Client approval on bridal reel",
    assignee: "Tanvi",
    due: "Waiting 3 days",
    score: 145,
    reason: "Approval waiting >2 days",
    health: "amber",
  },
  {
    id: "4",
    client: "Hindustan Motors",
    task: "Shoot day prep – tomorrow",
    assignee: "Tosseeb",
    due: "Tomorrow",
    score: 95,
    reason: "Shoot tomorrow",
    health: "green",
  },
];

export default function TodayPage() {
  const [filter, setFilter] = useState<"mine" | "everyone">("everyone");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">
          What must we do today, and which client is falling behind?
        </p>
      </header>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter("everyone")}
          className={`px-3 py-1 text-sm rounded-full border ${filter === "everyone" ? "bg-foreground text-background" : ""}`}
        >
          Everyone
        </button>
        <button
          onClick={() => setFilter("mine")}
          className={`px-3 py-1 text-sm rounded-full border ${filter === "mine" ? "bg-foreground text-background" : ""}`}
        >
          Mine
        </button>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Priority for today
        </h2>
        <div className="space-y-2">
          {DEMO_TODAY.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      item.health === "red"
                        ? "bg-red"
                        : item.health === "amber"
                        ? "bg-amber"
                        : "bg-green"
                    }`}
                  />
                  <p className="font-medium truncate">{item.client}</p>
                </div>
                <p className="text-sm mt-1">{item.task}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.assignee} · {item.due} · {item.reason}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button className="text-xs px-3 py-1 rounded-lg bg-green text-white">
                  Done
                </button>
                <button className="text-xs px-3 py-1 rounded-lg border">
                  Snooze
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Clients going cold
        </h2>
        <div className="rounded-xl border border-red/30 bg-red/5 p-4">
          <p className="font-medium">Purwar Electricals</p>
          <p className="text-sm text-muted-foreground">Last activity 9 days ago</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Today&apos;s shoot
        </h2>
        <div className="rounded-xl border p-4">
          <p className="font-medium">No shoot scheduled today</p>
          <p className="text-sm text-muted-foreground">Next: Hindustan Motors tomorrow</p>
        </div>
      </section>
    </div>
  );
}
