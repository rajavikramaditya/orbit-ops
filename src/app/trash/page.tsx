"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useStore, EntityKind } from "@/lib/store";
import { Button, Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { Forbidden } from "@/components/Forbidden";
import { formatDateTimeIST } from "@/lib/business-rules";

export default function TrashPage() {
  const store = useStore();
  if (!store.can("view_trash")) return <Forbidden what="Trash" />;
  const s = store.state;
  const groups: { kind: EntityKind; label: string; items: { id: string; label: string; deletedAt?: string | null }[] }[] = [
    { kind: "clients", label: "Clients", items: s.clients.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.officialName, deletedAt: x.deletedAt })) },
    { kind: "content", label: "Content items", items: s.content.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.title, deletedAt: x.deletedAt })) },
    { kind: "tasks", label: "Tasks", items: s.tasks.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.title, deletedAt: x.deletedAt })) },
    { kind: "requests", label: "Requests", items: s.requests.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.body.slice(0, 60), deletedAt: x.deletedAt })) },
    { kind: "projects", label: "Projects", items: s.projects.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.name, deletedAt: x.deletedAt })) },
    { kind: "leads", label: "Leads", items: s.leads.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.businessName, deletedAt: x.deletedAt })) },
    { kind: "documents", label: "Files", items: s.documents.filter((x) => x.deletedAt).map((x) => ({ id: x.id, label: x.title, deletedAt: x.deletedAt })) },
  ];
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <div>
      <PageHeader title="Trash" subtitle="Nothing is permanently deleted by normal users. Owners can restore or permanently delete." />
      {total === 0 ? <Card><EmptyState title="Trash is empty" /></Card> : (
        <div className="space-y-4">
          {groups.filter((g) => g.items.length).map((g) => (
            <Card key={g.kind} title={<>{g.label} <Pill>{g.items.length}</Pill></>} padded={false}>
              <ul className="divide-y">
                {g.items.map((it) => (
                  <li key={it.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-medium truncate" lang="hi">{it.label}</p><p className="text-xs muted">Deleted {formatDateTimeIST(it.deletedAt)}</p></div>
                    <div className="flex gap-2">
                      {store.can("restore_trash") && <Button size="sm" variant="ghost" onClick={() => store.restore(g.kind, it.id)}><RotateCcw size={13} /> Restore</Button>}
                      {store.can("permanent_delete") && <Button size="sm" variant="ghost" className="text-[#dc2626]" onClick={() => { if (confirm("Permanently delete? This cannot be undone.")) store.permanentDelete(g.kind, it.id); }}><Trash2 size={13} /></Button>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
