"use client";

import { useStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/rbac";
import { Avatar } from "@/components/ui";

/**
 * Demo-mode identity switcher. When Supabase Auth is configured, this is replaced by the real
 * session (see README → "Connect Supabase Auth"). Roles are still enforced server-side & by RLS.
 */
export function UserSwitcher() {
  const store = useStore();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        <Avatar name={store.currentUser.name} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{store.currentUser.name}</p>
          <p className="text-xs muted truncate">{ROLE_LABEL[store.role]} · {store.currentUser.specialty}</p>
        </div>
      </div>
      <label className="block">
        <span className="sr-only">Switch user (demo)</span>
        <select className="input !min-h-[40px] text-xs" value={store.currentUser.id} onChange={(e) => store.switchUser(e.target.value)}>
          {store.state.team.filter((t) => t.active).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {ROLE_LABEL[t.role]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-[10px] muted mt-1.5">Demo login · switch role to test permissions</p>
    </div>
  );
}
