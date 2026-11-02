"use client";

import { use, useState } from "react";
import { useStore, STAGE_LABEL } from "@/lib/store";
import { Button, Pill, Textarea } from "@/components/ui";
import { formatDateDDMMYYYY } from "@/lib/business-rules";

/**
 * Read-only client portal (Phase 3). Opened via a private token link. The client can approve
 * or request changes on items that are "Ready for approval". No login, no internal data.
 */
export default function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const store = useStore();
  const [note, setNote] = useState<Record<string, string>>({});
  if (!store.hydrated) return null;
  const client = store.state.clients.find((c) => c.portalToken === token && !c.deletedAt);
  if (!client) return <div className="min-h-dvh flex items-center justify-center p-6 text-center"><p>This link is not valid. Please ask your Orbit Media contact for a new one.</p></div>;
  const items = store.state.content.filter((c) => c.clientId === client.id && !c.deletedAt && ["ready_for_approval", "approved", "scheduled", "posted"].includes(c.stage)).sort((a) => (a.stage === "ready_for_approval" ? -1 : 1));
  const pending = items.filter((c) => c.stage === "ready_for_approval");

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <header className="border-b px-5 py-4 flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-widest muted">Orbit Media by Orbitcore</p><h1 className="font-semibold">{client.officialName}</h1></div><Pill>{pending.length} awaiting your approval</Pill></header>
      <main className="max-w-2xl mx-auto p-5 space-y-4">
        {pending.length === 0 && <p className="text-sm muted text-center py-6">Nothing awaiting approval right now.</p>}
        {items.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-2"><p className="font-medium" lang="hi">{c.title}</p><Pill tone={c.stage === "ready_for_approval" ? "amber" : "green"}>{STAGE_LABEL[c.stage]}</Pill></div>
            {c.caption && <p className="text-sm mt-2 whitespace-pre-wrap" lang="hi">{c.caption}</p>}
            {c.finalUrl && <a href={c.finalUrl} target="_blank" rel="noreferrer" className="text-sm underline mt-2 inline-block">Preview video</a>}
            {c.postOn && <p className="text-xs muted mt-2">Planned posting: {formatDateDDMMYYYY(c.postOn)}</p>}
            {c.stage === "ready_for_approval" && (
              <div className="mt-3 space-y-2">
                <Textarea placeholder="Any changes? (Hindi / English)" value={note[c.id] ?? ""} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} className="min-h-[60px]" lang="hi" />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => store.moveContentStage(c.id, "approved")}>Approve</Button>
                  <Button className="flex-1" variant="ghost" disabled={!note[c.id]} onClick={() => store.moveContentStage(c.id, "revision_requested", note[c.id])}>Request changes</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <p className="text-[11px] muted text-center pt-6">Private link · do not forward. Powered by Orbit Ops.</p>
      </main>
    </div>
  );
}
