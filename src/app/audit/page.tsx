"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Input, PageHeader, Select } from "@/components/ui";
import { Forbidden } from "@/components/Forbidden";
import { ActivityList } from "@/app/clients/[id]/page";

export default function AuditPage() {
  const store = useStore();
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("all");
  const [type, setType] = useState("all");
  const items = useMemo(() => store.state.activity.filter((a) => (actor === "all" || a.actorId === actor) && (type === "all" || a.entityType === type) && (!q || a.summary.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.at.localeCompare(a.at)), [store.state.activity, q, actor, type]);
  if (!store.can("view_audit")) return <Forbidden what="the Audit log" />;
  const types = Array.from(new Set(store.state.activity.map((a) => a.entityType)));
  return (
    <div>
      <PageHeader title="Audit log" subtitle={`${store.state.activity.length} entries · every create, update, stage change, payment and delete, with who and when. In production, rows are written by a database trigger and cannot be edited.`} />
      <div className="grid gap-2 sm:grid-cols-3 mb-4">
        <Input placeholder="Search summary" value={q} onChange={(e) => setQ(e.target.value)} lang="hi" />
        <Select value={actor} onChange={(e) => setActor(e.target.value)}><option value="all">Everyone</option>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        <Select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All entity types</option>{types.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</Select>
      </div>
      <Card padded={false}><ActivityList items={items.slice(0, 300)} showClient /></Card>
    </div>
  );
}
