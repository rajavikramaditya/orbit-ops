"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, Textarea } from "@/components/ui";
import { formatDateTimeIST } from "@/lib/business-rules";
import { CommentItem } from "@/lib/types";

export function Comments({ entityType, entityId, clientId }: { entityType: CommentItem["entityType"]; entityId: string; clientId?: string }) {
  const store = useStore();
  const teamName = useTeamName();
  const [body, setBody] = useState("");
  const list = store.state.comments.filter((c) => c.entityType === entityType && c.entityId === entityId && !c.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const submit = () => {
    if (!body.trim()) return;
    const mentions = store.state.team.filter((t) => body.toLowerCase().includes("@" + t.name.split(" ")[0].toLowerCase())).map((t) => t.id);
    store.addComment({ entityType, entityId, clientId, body: body.trim(), mentions });
    setBody("");
  };

  return (
    <div>
      <p className="label">Comments</p>
      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {list.length === 0 && <p className="text-xs muted">No comments yet. Use @Name to mention a teammate.</p>}
        {list.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar name={teamName(c.createdBy)} />
            <div className="min-w-0">
              <p className="text-xs"><span className="font-semibold">{teamName(c.createdBy)}</span> <span className="muted">· {formatDateTimeIST(c.createdAt)}</span></p>
              <p className="text-sm whitespace-pre-wrap" lang="hi">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment… @Tanvi @Prathmes" className="min-h-[64px]" lang="hi" />
        <div className="flex justify-end"><Button size="sm" onClick={submit} disabled={!body.trim()}>Comment</Button></div>
      </div>
    </div>
  );
}
