import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";

/** Sales pipeline API — Owners only, enforced server-side. */
export async function GET(req: NextRequest) {
  const gate = await requirePermission(req, "view_sales");
  if (!gate.ok) return gate.response;
  const admin = getServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ mode: "demo", message: "Supabase not configured; leads live in the client store in demo mode." });
  const { data: leads } = await admin.from("leads").select("*, lead_research(*)").is("deleted_at", null);
  return NextResponse.json({ leads });
}
