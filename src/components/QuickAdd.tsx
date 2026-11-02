"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, CheckSquare, Inbox, Phone, StickyNote } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Modal, Select, Textarea, Segmented, cn } from "@/components/ui";
import { checkSpellingGuard } from "@/lib/business-rules";
import { ContentType, RequestChannel, TaskPriority } from "@/lib/types";

type Kind = "request" | "task" | "content" | "call" | "note";

interface QuickAddProps {
  open: boolean;
  onClose: () => void;
  defaultClientId?: string;
  defaultKind?: Kind;
}

export function QuickAdd(props: QuickAddProps) {
  // Mounting the form only while open gives it fresh state on every open.
  if (!props.open) return null;
  return <QuickAddForm {...props} />;
}

function QuickAddForm({ open, onClose, defaultClientId, defaultKind }: QuickAddProps) {
  const store = useStore();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(defaultKind ?? "request");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<RequestChannel>("call");
  const [priority, setPriority] = useState<TaskPriority>("P2");
  const [assignee, setAssignee] = useState(store.currentUser.id);
  const [dueOn, setDueOn] = useState(store.today);
  const [ctype, setCtype] = useState<ContentType>("reel");
  const [done, setDone] = useState<string | null>(null);

  const clients = store.state.clients.filter((c) => !c.deletedAt && c.status !== "churned");
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");


  const warnings = useMemo(() => checkSpellingGuard(body, store.state.clients), [body, store.state.clients]);

  const submit = () => {
    if (!body.trim()) return;
    try {
      if (kind === "request" || kind === "call") {
        if (!clientId) return;
        store.addRequest({ clientId, body: body.trim(), channel: kind === "call" ? "call" : channel, priority });
        setDone("Request logged. Tanvi will triage it from the Requests inbox.");
      } else if (kind === "task") {
        store.addTask({ title: body.trim(), clientId: clientId || undefined, priority, assigneeId: assignee, dueOn });
        setDone("Task added.");
      } else if (kind === "content") {
        if (!clientId) return;
        store.addContent({ clientId, title: body.trim(), type: ctype, dueOn });
        setDone("Content idea added to the pipeline.");
      } else if (kind === "note") {
        store.addComment({ entityType: "client", entityId: clientId, clientId, body: body.trim(), mentions: [] });
        setDone("Note saved on client timeline.");
      }
    } catch (e) {
      setDone((e as Error).message);
    }
  };

  const options: { id: Kind; label: string; icon: React.ReactNode }[] = [
    { id: "request", label: "Request", icon: <Inbox size={14} /> },
    { id: "call", label: "Log a call", icon: <Phone size={14} /> },
    { id: "task", label: "Task", icon: <CheckSquare size={14} /> },
    { id: "content", label: "Content", icon: <Clapperboard size={14} /> },
    { id: "note", label: "Note", icon: <StickyNote size={14} /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Quick add">
      {done ? (
        <div className="text-center py-6">
          <p className="font-medium">{done}</p>
          <div className="flex gap-2 justify-center mt-5">
            <Button variant="ghost" onClick={() => setDone(null)}>
              Add another
            </Button>
            {(kind === "request" || kind === "call") && (
              <Button
                onClick={() => {
                  onClose();
                  router.push("/requests");
                }}
              >
                Open Requests
              </Button>
            )}
            {kind !== "request" && kind !== "call" && <Button onClick={onClose}>Done</Button>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-1.5">
            {options.map((o) => (
              <button key={o.id} onClick={() => setKind(o.id)} className={cn("flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] min-h-[56px]", kind === o.id ? "font-semibold border-[var(--fg)]" : "muted")}>
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>

          <Field label={kind === "task" ? "Client (optional)" : "Client"}>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {kind === "task" && <option value="">— Internal / no client —</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={kind === "request" || kind === "call" ? "What did they ask? (Hindi / Hinglish ok)" : kind === "task" ? "Task title" : kind === "content" ? "Idea / title" : "Note"}>
            <Textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "call" ? "e.g. Sharma ji ne Dhanteras offer video maanga, kal shaam tak" : "Type here…"} lang="hi" />
          </Field>
          {warnings.map((w) => (
            <p key={w.matchedWrongSpelling} className="text-xs rounded-lg px-3 py-2 pill-amber border">
              {w.message}
            </p>
          ))}

          {kind === "request" && (
            <Field label="Channel">
              <Segmented value={channel} onChange={setChannel} options={[{ id: "call", label: "Call" }, { id: "whatsapp", label: "WhatsApp" }, { id: "meeting", label: "Meeting" }, { id: "other", label: "Other" }]} />
            </Field>
          )}

          {(kind === "request" || kind === "call" || kind === "task") && (
            <Field label="Priority">
              <Segmented value={priority} onChange={setPriority} options={[{ id: "P1", label: "P1 urgent" }, { id: "P2", label: "P2 normal" }, { id: "P3", label: "P3 low" }]} />
            </Field>
          )}

          {kind === "task" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assignee">
                <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  {store.state.team.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </Field>
            </div>
          )}

          {kind === "content" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={ctype} onChange={(e) => setCtype(e.target.value as ContentType)}>
                  {["reel", "video", "poster", "carousel", "story_set", "ad_creative"].map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due">
                <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </Field>
            </div>
          )}

          <Button className="w-full" onClick={submit} disabled={!body.trim()}>
            Save
          </Button>
        </div>
      )}
    </Modal>
  );
}
