import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/server/auth";
import { getServerSupabaseAdmin } from "@/lib/supabase/client";
import { emailService } from "@/lib/notifications";

const InviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["owner", "manager", "team"]),
  specialty: z.string().max(200).optional(),
  invitedBy: z.string().max(120).optional(),
});

/** Invite-only user creation. Owners only. */
export async function POST(req: NextRequest) {
  const gate = await requirePermission(req, "manage_users");
  if (!gate.ok) return gate.response;
  const body = InviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid", issues: body.error.issues }, { status: 400 });

  const admin = getServerSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(body.data.email, { data: { name: body.data.name, role: body.data.role } });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data: org } = await admin.from("organizations").select("id").limit(1).single();
    await admin.from("profiles").upsert({ auth_user_id: data.user?.id, organization_id: org?.id, name: body.data.name, email: body.data.email, role: body.data.role, specialty: body.data.specialty ?? null }, { onConflict: "email" });
  }
  const mail = await emailService.sendUserInvite({ email: body.data.email, name: body.data.name, role: body.data.role, invitedBy: body.data.invitedBy ?? "Orbit Ops" });
  return NextResponse.json({ ok: true, mail, mode: admin ? "supabase" : "demo" });
}
