import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";

/**
 * Money API — enforced on the server. A Team user calling this directly gets 403,
 * regardless of what the UI hides (acceptance criterion #5). With Supabase connected,
 * RLS on invoices/payments/quotations adds a second, database-level barrier.
 */
export async function GET(req: NextRequest) {
  const gate = await requirePermission(req, "view_money");
  if (!gate.ok) return gate.response;
  const admin = getServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ mode: "demo", message: "Supabase not configured; money data lives in the client store in demo mode." });
  const [{ data: invoices }, { data: payments }] = await Promise.all([
    admin.from("invoices").select("*").is("deleted_at", null).order("issue_date", { ascending: false }),
    admin.from("payments").select("*").is("deleted_at", null).order("paid_on", { ascending: false }),
  ]);
  return NextResponse.json({ invoices, payments });
}
