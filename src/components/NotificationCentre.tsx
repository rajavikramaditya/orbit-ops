"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Modal } from "@/components/ui";
import { formatDateTimeIST } from "@/lib/business-rules";

export function NotificationCentre({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const mine = store.state.notifications.filter((n) => n.recipientId === store.currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs muted">Daily digest email goes out at 9:00 AM IST · WhatsApp reminders ready via official Cloud API</p>
        {mine.some((n) => !n.readAt) && (
          <Button size="sm" variant="ghost" onClick={store.markAllNotificationsRead}>
            Mark all read
          </Button>
        )}
      </div>
      {mine.length === 0 && <p className="muted text-sm text-center py-8">You&apos;re all caught up.</p>}
      <ul className="divide-y rounded-xl border">
        {mine.map((n) => (
          <li key={n.id} className={`px-3 py-3 ${n.readAt ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-2">
              {!n.readAt && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#dc2626] shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs muted">{n.body}</p>
                <p className="text-[11px] muted mt-1">{formatDateTimeIST(n.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-1">
                {n.linkUrl && (
                  <Link href={n.linkUrl} onClick={() => { store.markNotificationRead(n.id); onClose(); }} className="text-xs underline">
                    Open
                  </Link>
                )}
                {!n.readAt && (
                  <button className="text-xs muted underline" onClick={() => store.markNotificationRead(n.id)}>
                    Read
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
