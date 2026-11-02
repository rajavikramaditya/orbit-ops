"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, STAGE_LABEL } from "@/lib/store";
import { fuzzyIncludes } from "@/lib/selectors";
import { Input, Modal, Pill } from "@/components/ui";

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = store.state;
    const out: { group: string; label: string; sub?: string; href: string }[] = [];
    const cname = (id?: string) => s.clients.find((c) => c.id === id)?.displayName ?? "";
    for (const c of s.clients.filter((c) => !c.deletedAt)) {
      if ([c.officialName, c.displayName, ...c.aliases, ...c.wrongSpellings, c.industry, c.city].some((v) => fuzzyIncludes(v ?? "", q))) {
        out.push({ group: "Clients", label: c.displayName, sub: c.industry, href: `/clients/${c.id}` });
      }
    }
    for (const ci of s.content.filter((c) => !c.deletedAt)) {
      if (fuzzyIncludes(ci.title + " " + (ci.script ?? "") + " " + (ci.caption ?? ""), q)) out.push({ group: "Content", label: ci.title, sub: `${cname(ci.clientId)} · ${STAGE_LABEL[ci.stage]}`, href: `/content?focus=${ci.id}` });
    }
    for (const t of s.tasks.filter((c) => !c.deletedAt)) {
      if (fuzzyIncludes(t.title + " " + (t.description ?? ""), q)) out.push({ group: "Tasks", label: t.title, sub: cname(t.clientId) || "Internal", href: `/tasks?focus=${t.id}` });
    }
    for (const r of s.requests.filter((c) => !c.deletedAt)) {
      if (fuzzyIncludes(r.body, q)) out.push({ group: "Requests", label: r.body.slice(0, 80), sub: cname(r.clientId), href: `/requests` });
    }
    if (store.can("view_sales")) {
      for (const l of s.leads.filter((c) => !c.deletedAt)) {
        if (fuzzyIncludes(l.businessName + " " + l.contactName, q)) out.push({ group: "Leads", label: l.businessName, sub: l.contactName, href: `/sales` });
      }
    }
    for (const d of s.documents.filter((c) => !c.deletedAt)) {
      if (fuzzyIncludes(d.title, q)) out.push({ group: "Files", label: d.title, sub: cname(d.clientId), href: `/clients/${d.clientId}?tab=files` });
    }
    for (const p of s.projects.filter((c) => !c.deletedAt)) {
      if (fuzzyIncludes(p.name + " " + p.scope, q)) out.push({ group: "Projects", label: p.name, sub: cname(p.clientId), href: `/projects` });
    }
    return out.slice(0, 40);
  }, [q, store]);

  const groups = Array.from(new Set(results.map((r) => r.group)));

  return (
    <Modal open={open} onClose={onClose} title="Search">
      <Input autoFocus placeholder="Search clients, content, tasks, leads, files… (Hindi supported, misspellings tolerated)" value={q} onChange={(e) => setQ(e.target.value)} lang="hi" />
      <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {q && results.length === 0 && <p className="muted text-sm text-center py-6">No matches for “{q}”.</p>}
        {groups.map((g) => (
          <div key={g}>
            <p className="label">{g}</p>
            <div className="divide-y rounded-xl border">
              {results
                .filter((r) => r.group === g)
                .map((r, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2.5 row-hover first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => {
                      onClose();
                      setQ("");
                      router.push(r.href);
                    }}
                  >
                    <p className="text-sm font-medium">{r.label}</p>
                    {r.sub && <p className="text-xs muted">{r.sub}</p>}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {!q && (
          <div className="text-xs muted space-y-1">
            <p>Tips:</p>
            <p>
              Try <Pill>Heaven</Pill> to find <strong>Haven Solutions</strong>, or <Pill>Ma Sharda</Pill> for <strong>Maa Sharda Jewellers</strong>.
            </p>
            <p>Hindi works too: <span lang="hi">सोने का भाव</span></p>
          </div>
        )}
      </div>
    </Modal>
  );
}
