import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/server/auth";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";
import { emailService, DailyDigestPayload } from "@/lib/notifications";
import { calculatePriorityScore, formatDateDDMMYYYY, DEFAULT_PRIORITY_WEIGHTS } from "@/lib/business-rules";

/**
 * Daily digest — scheduled by Vercel Cron at 03:30 UTC = 09:00 IST (see vercel.json).
 * Each user receives their priorities; Owners also get cold clients and pending money.
 */
export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = getServerSupabaseAdmin();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  if (!admin) {
    return NextResponse.json({ ok: true, mode: "demo", message: "Supabase not configured — digest simulated. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY to send real emails.", today });
  }

  const [{ data: profiles }, { data: tasks }, { data: clients }, { data: invoices }] = await Promise.all([
    admin.from("profiles").select("id, name, email, role").eq("active", true).is("deleted_at", null),
    admin.from("tasks").select("id, title, assignee_id, client_id, priority, due_on").neq("status", "done").is("deleted_at", null),
    admin.from("clients").select("id, display_name, last_activity_at").is("deleted_at", null),
    admin.from("invoices").select("id, total_paise, due_date, status").is("deleted_at", null).neq("status", "paid"),
  ]);
  const clientName = (id: string | null) => clients?.find((c) => c.id === id)?.display_name ?? "Internal";
  const results: { email: string; ok: boolean }[] = [];

  for (const p of profiles ?? []) {
    const mine = (tasks ?? []).filter((t) => t.assignee_id === p.id || p.role !== "team");
    const items = mine
      .map((t) => {
        const score = calculatePriorityScore({ priority: t.priority, dueOn: t.due_on, todayStr: today, weights: DEFAULT_PRIORITY_WEIGHTS });
        return { clientName: clientName(t.client_id), title: t.title, dueOn: t.due_on, score: score.score, reasonSummary: score.reasonSummary };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    const payload: DailyDigestPayload = { recipientEmail: p.email, recipientName: p.name, role: p.role, dateFormatted: formatDateDDMMYYYY(today), priorityItems: items };
    if (p.role === "owner") {
      payload.coldClients = (clients ?? []).map((c) => ({ clientName: c.display_name, inactiveDays: Math.floor((Date.now() - new Date(c.last_activity_at).getTime()) / 86400000) })).filter((c) => c.inactiveDays > 3);
      payload.pendingInvoicesPaise = (invoices ?? []).reduce((a, i) => a + Number(i.total_paise), 0);
    }
    const r = await emailService.sendDailyDigest(payload);
    results.push({ email: p.email, ok: r.ok });
  }
  return NextResponse.json({ ok: true, sent: results.length, results, today });
}
