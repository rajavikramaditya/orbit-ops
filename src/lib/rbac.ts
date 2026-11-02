import { UserRole } from "./types";

/**
 * Permission matrix (Section 4). Used on the client (to hide UI) AND on the server/API
 * (to actually enforce). Database RLS mirrors the same rules in supabase/migrations.
 */
export type Permission =
  | "view_today"
  | "view_clients"
  | "manage_clients"
  | "view_money"
  | "manage_money"
  | "manage_money_settings"
  | "view_sales"
  | "manage_sales"
  | "view_requests"
  | "triage_requests"
  | "manage_content"
  | "manage_tasks"
  | "manage_shoots"
  | "manage_projects"
  | "view_reports"
  | "view_team"
  | "manage_settings"
  | "manage_users"
  | "view_audit"
  | "view_trash"
  | "restore_trash"
  | "permanent_delete"
  | "export_all";

const MATRIX: Record<UserRole, Permission[]> = {
  owner: [
    "view_today",
    "view_clients",
    "manage_clients",
    "view_money",
    "manage_money",
    "manage_money_settings",
    "view_sales",
    "manage_sales",
    "view_requests",
    "triage_requests",
    "manage_content",
    "manage_tasks",
    "manage_shoots",
    "manage_projects",
    "view_reports",
    "view_team",
    "manage_settings",
    "manage_users",
    "view_audit",
    "view_trash",
    "restore_trash",
    "permanent_delete",
    "export_all",
  ],
  manager: [
    "view_today",
    "view_clients",
    "manage_clients",
    "view_money",
    "manage_money",
    "view_requests",
    "triage_requests",
    "manage_content",
    "manage_tasks",
    "manage_shoots",
    "manage_projects",
    "view_reports",
    "view_team",
    "view_audit",
    "view_trash",
  ],
  team: ["view_today", "view_clients", "view_requests", "manage_content", "manage_tasks"],
};

export function can(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(permission);
}

export function assertCan(role: UserRole | undefined | null, permission: Permission): void {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: role "${role ?? "anonymous"}" lacks permission "${permission}"`);
  }
}

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  team: "Team",
};
