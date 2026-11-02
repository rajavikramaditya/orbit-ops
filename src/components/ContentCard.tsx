"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Trash2, Undo2 } from "lucide-react";
import { useStore, STAGE_LABEL, STAGE_ORDER } from "@/lib/store";
import { useTeamName } from "@/lib/hooks";
import { Avatar, Button, DateText, Field, Input, Modal, Pill, Select, Textarea, cn } from "@/components/ui";
import { ContentItem, ContentStage } from "@/lib/types";
import { daysBetweenDates } from "@/lib/business-rules";
import { Comments } from "@/components/Comments";

export function nextStage(stage: ContentStage): ContentStage | null {
  if (stage === "revision_requested") return "in_editing";
  const i = STAGE_ORDER.indexOf(stage);
  if (i < 0 || i === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

export function ContentCard({ item, showClient, compact, highlight }: { item: ContentItem; showClient?: boolean; compact?: boolean; highlight?: boolean }) {
  const store = useStore();
  const teamName = useTeamName();
  const [open, setOpen] = useState(false);
  const client = store.state.clients.find((c) => c.id === item.clientId);
  const overdue = item.dueOn && item.stage !== "posted" && item.stage !== "dropped" ? daysBetweenDates(item.dueOn, store.today) : 0;
  const waiting = item.stage === "ready_for_approval" ? daysBetweenDates(item.stageChangedAt.slice(0, 10), store.today) : 0;
  const next = nextStage(item.stage);
  const canEdit = store.can("manage_content") && (store.role !== "team" || item.assigneeId === store.currentUser.id);

  return (
    <>
      <div className={cn("card p-3 text-sm", highlight && "ring-2 ring-[var(--fg)]", compact && "p-2.5")}>
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => setOpen(true)} className="text-left min-w-0 flex-1">
            {showClient && <p className="text-[11px] uppercase tracking-wide font-semibold muted truncate">{client?.displayName}</p>}
            <p className="font-medium leading-snug" lang="hi">{item.title}</p>
          </button>
          <Pill className="shrink-0">{item.type.replace("_", " ")}</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] muted">
          <Avatar name={teamName(item.assigneeId)} />
          <span>{teamName(item.assigneeId)}</span>
          {item.dueOn && <span>· due <DateText value={item.dueOn} /></span>}
          {item.postOn && <span>· post <DateText value={item.postOn} /></span>}
          {overdue > 0 && <Pill tone="red">{overdue}d late</Pill>}
          {waiting > 2 && <Pill tone="amber">waiting {waiting}d</Pill>}
          {item.revisionCount > 0 && <Pill>rev {item.revisionCount}</Pill>}
        </div>
        {canEdit && next && (
          <div className="flex gap-1.5 mt-2.5">
            <button onClick={() => store.moveContentStage(item.id, next)} className="btn btn-ghost btn-sm flex-1 justify-between">
              <span className="truncate">→ {STAGE_LABEL[next]}</span>
              <ArrowRight size={13} />
            </button>
            {item.stage === "ready_for_approval" && (
              <button onClick={() => store.moveContentStage(item.id, "revision_requested")} className="btn btn-ghost btn-sm" title="Request revision">
                <Undo2 size={13} />
              </button>
            )}
            <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm" title="Details & comments">
              <MessageSquare size={13} />
            </button>
          </div>
        )}
      </div>
      <ContentDetailModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ContentDetailModal({ item, open, onClose }: { item: ContentItem; open: boolean; onClose: () => void }) {
  const store = useStore();
  const client = store.state.clients.find((c) => c.id === item.clientId);
  const canEdit = store.can("manage_content") && (store.role !== "team" || item.assigneeId === store.currentUser.id);
  const [form, setForm] = useState({ title: item.title, script: item.script ?? "", caption: item.caption ?? "", hashtags: item.hashtags ?? "", rawUrl: item.rawUrl ?? "", finalUrl: item.finalUrl ?? "", dueOn: item.dueOn ?? "", postOn: item.postOn ?? "", plannedShootOn: item.plannedShootOn ?? "", assigneeId: item.assigneeId, platforms: item.platforms.join(", "), feedbackNotes: item.feedbackNotes ?? "", type: item.type });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  const save = () => {
    store.updateContent(item.id, { ...form, type: form.type as ContentItem["type"], script: form.script || undefined, caption: form.caption || undefined, hashtags: form.hashtags || undefined, rawUrl: form.rawUrl || undefined, finalUrl: form.finalUrl || undefined, dueOn: form.dueOn || undefined, postOn: form.postOn || undefined, plannedShootOn: form.plannedShootOn || undefined, feedbackNotes: form.feedbackNotes || undefined, platforms: form.platforms.split(",").map((p) => p.trim()).filter(Boolean) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={client?.displayName ?? "Content item"} wide>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pill>{STAGE_LABEL[item.stage]}</Pill>
            {canEdit && (
              <Select className="!min-h-[36px] !w-auto text-xs" value={item.stage} onChange={(e) => store.moveContentStage(item.id, e.target.value as ContentStage)}>
                {[...STAGE_ORDER, "revision_requested", "dropped"].map((s) => <option key={s} value={s}>{STAGE_LABEL[s as ContentStage]}</option>)}
              </Select>
            )}
            <Link href={`/clients/${item.clientId}`} className="text-xs underline ml-auto">Open client</Link>
          </div>
          <Field label="Title"><Input value={form.title} onChange={set("title")} disabled={!canEdit} lang="hi" /></Field>
          <Field label="Hook / script notes (Hindi · Hinglish · English)"><Textarea value={form.script} onChange={set("script")} disabled={!canEdit} lang="hi" className="min-h-[110px]" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={form.type} onChange={set("type")} disabled={!canEdit}>{["reel", "video", "poster", "carousel", "story_set", "ad_creative"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Assignee"><Select value={form.assigneeId} onChange={set("assigneeId")} disabled={!canEdit}>{store.state.team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
            <Field label="Planned shoot"><Input type="date" value={form.plannedShootOn} onChange={set("plannedShootOn")} disabled={!canEdit} /></Field>
            <Field label="Due"><Input type="date" value={form.dueOn} onChange={set("dueOn")} disabled={!canEdit} /></Field>
            <Field label="Posting date"><Input type="date" value={form.postOn} onChange={set("postOn")} disabled={!canEdit} /></Field>
            <Field label="Platforms"><Input value={form.platforms} onChange={set("platforms")} disabled={!canEdit} placeholder="Instagram, Facebook, YouTube" /></Field>
          </div>
          <Field label="Raw footage link (Drive)"><Input value={form.rawUrl} onChange={set("rawUrl")} disabled={!canEdit} placeholder="https://drive.google.com/…" /></Field>
          <Field label="Final file link"><Input value={form.finalUrl} onChange={set("finalUrl")} disabled={!canEdit} /></Field>
          <Field label="Caption"><Textarea value={form.caption} onChange={set("caption")} disabled={!canEdit} lang="hi" /></Field>
          <Field label="Hashtags"><Input value={form.hashtags} onChange={set("hashtags")} disabled={!canEdit} /></Field>
          <Field label={`Feedback / revision notes (${item.revisionCount} revisions)`}><Textarea value={form.feedbackNotes} onChange={set("feedbackNotes")} disabled={!canEdit} lang="hi" /></Field>
          <div className="flex justify-between items-center pt-2">
            {store.can("manage_clients") ? (
              <button className="text-xs muted inline-flex items-center gap-1 hover:text-[#dc2626]" onClick={() => { store.softDelete("content", item.id); onClose(); }}>
                <Trash2 size={13} /> Move to trash
              </button>
            ) : <span />}
            {canEdit && <Button onClick={save}>Save</Button>}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Comments entityType="content_item" entityId={item.id} clientId={item.clientId} />
        </div>
      </div>
    </Modal>
  );
}
