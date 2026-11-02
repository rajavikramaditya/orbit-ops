import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/auth";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";

const TABLES = ["clients", "client_contacts", "client_social_accounts", "client_brand_assets", "client_plans", "content_items", "shoots", "shoot_items", "tasks", "requests", "projects", "onboarding_steps", "leads", "lead_research", "invoices", "invoice_items", "quotations", "payments", "documents", "comments", "activity_log", "settings", "profiles"];

/**
 * Weekly backup — Vercel Cron, Sunday 22:30 UTC (Monday 04:00 IST). Dumps every table to JSON in the
 * private `backups` storage bucket so the agency is never locked in.
 */
export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: true, mode: "demo", message: "Supabase not configured — nothing to back up server-side." });

  const dump: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data } = await admin.from(t).select("*");
    dump[t] = data ?? [];
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const path = `weekly/orbit-ops-backup-${stamp}.json`;
  const { error } = await admin.storage.from("backups").upload(path, JSON.stringify(dump), { contentType: "application/json", upsert: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, path, tables: TABLES.length });
}
