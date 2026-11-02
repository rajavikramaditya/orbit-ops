'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CLIENTS: Record<string, {
  name: string;
  status: string;
  package: string;
  progress: string;
  lastActivity: string;
  health: "green" | "amber" | "red";
  owner: string;
  industry: string;
  city: string;
  notes: string;
}> = {
  "1": {
    name: "Mahindra Dhruvtara",
    status: "Active",
    package: "12 videos / month",
    progress: "7 of 12",
    lastActivity: "2 days ago",
    health: "amber",
    owner: "Ram Soni",
    industry: "Automotive",
    city: "Orai",
    notes: "High-rated dealership. Focus on reels and Google reviews.",
  },
  "2": {
    name: "Sparkle Makeover",
    status: "Active",
    package: "8 videos / month",
    progress: "5 of 8",
    lastActivity: "1 day ago",
    health: "green",
    owner: "Tanvi",
    industry: "Beauty",
    city: "Orai",
    notes: "Largest beauty account in Orai. Bridal content performs well.",
  },
  "3": {
    name: "Havells Galaxy",
    status: "Active",
    package: "12 videos / month",
    progress: "4 of 12",
    lastActivity: "5 days ago",
    health: "red",
    owner: "Vikas Rathore",
    industry: "Electricals",
    city: "Orai",
    notes: "Behind schedule. Need more product videos this week.",
  },
  "4": {
    name: "Hindustan Motors",
    status: "Onboarding",
    package: "8 videos / month",
    progress: "0 of 8",
    lastActivity: "Today",
    health: "green",
    owner: "Ram Soni",
    industry: "Automotive",
    city: "Konch",
    notes: "New client. First shoot scheduled tomorrow.",
  },
};

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const client = CLIENTS[id];

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto">
        <p>Client not found.</p>
        <Link href="/clients" className="text-sm underline mt-2 inline-block">Back to clients</Link>
      </div>
    );
  }

  const healthColor = client.health === "red" ? "bg-red" : client.health === "amber" ? "bg-amber" : "bg-green";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${healthColor}`} />
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {client.industry} · {client.city} · {client.owner}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full border">{client.status}</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Package</p>
          <p className="font-medium mt-1">{client.package}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">This cycle</p>
          <p className="font-medium mt-1">{client.progress} posted</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Last activity</p>
          <p className="font-medium mt-1">{client.lastActivity}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Cycle progress</span>
          <span>{client.progress}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground"
            style={{
              width: client.progress.includes("of")
                ? `${(parseInt(client.progress.split(" ")[0]) / parseInt(client.progress.split(" ")[2])) * 100}%`
                : "0%",
            }}
          />
        </div>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="text-sm font-medium mb-2">Notes</h2>
        <p className="text-sm text-muted-foreground">{client.notes}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 text-sm rounded-lg border">+ Task</button>
        <button className="px-4 py-2 text-sm rounded-lg border">Log call</button>
        <button className="px-4 py-2 text-sm rounded-lg border">Add request</button>
      </div>
    </div>
  );
}
