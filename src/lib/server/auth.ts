import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/lib/types";
import { Permission, can } from "@/lib/rbac";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";

/**
 * Server-side role resolution.
 * - With Supabase configured: the caller's access token (Authorization: Bearer) is verified and
 *   the role is read from `profiles` — never trusted from the client.
 * - Without Supabase (local demo mode): the role comes from the `x-demo-role` header so the
 *   permission gate can still be exercised. Demo mode is only active when no Supabase keys exist.
 */
export async function resolveRole(req: NextRequest): Promise<{ role: UserRole | null; userId: string | null; mode: "supabase" | "demo" }> {
  const admin = getServerSupabaseAdmin();
  if (admin) {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return { role: null, userId: null, mode: "supabase" };
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return { role: null, userId: null, mode: "supabase" };
    const { data: profile } = await admin.from("profiles").select("id, role, active").eq("auth_user_id", data.user.id).is("deleted_at", null).maybeSingle();
    if (!profile || !profile.active) return { role: null, userId: null, mode: "supabase" };
    return { role: profile.role as UserRole, userId: profile.id as string, mode: "supabase" };
  }
  const demoRole = req.headers.get("x-demo-role") as UserRole | null;
  return { role: demoRole && ["owner", "manager", "team"].includes(demoRole) ? demoRole : null, userId: null, mode: "demo" };
}

export async function requirePermission(req: NextRequest, permission: Permission) {
  const ctx = await resolveRole(req);
  if (!can(ctx.role, permission)) {
    return { ok: false as const, response: NextResponse.json({ error: "forbidden", permission, role: ctx.role, mode: ctx.mode }, { status: ctx.role ? 403 : 401 }) };
  }
  return { ok: true as const, ctx };
}

export function requireCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret) return true; // allow in local dev
  return header === `Bearer ${secret}`;
}
