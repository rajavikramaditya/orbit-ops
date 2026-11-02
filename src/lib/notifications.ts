/**
 * Transactional Email & Official WhatsApp Cloud API Notification Layer (Section 6.12)
 * - Uses Resend (or compatible transactional email provider) behind an interface so it can be swapped.
 * - Uses Official Meta WhatsApp Business Cloud API behind an interface so reminders can be enabled via env vars.
 */

export interface DailyDigestPayload {
  recipientEmail: string;
  recipientName: string;
  role: "owner" | "manager" | "team";
  dateFormatted: string;
  priorityItems: {
    clientName: string;
    title: string;
    dueOn: string;
    score: number;
    reasonSummary: string;
  }[];
  coldClients?: { clientName: string; inactiveDays: number }[];
  pendingInvoicesPaise?: number;
}

export interface EmailProvider {
  sendDailyDigest(payload: DailyDigestPayload): Promise<{ ok: boolean; provider: string; id?: string }>;
  sendUserInvite(params: { email: string; name: string; role: string; invitedBy: string }): Promise<{ ok: boolean; provider: string }>;
}

export interface WhatsAppCloudProvider {
  sendTemplateReminder(params: {
    toPhone: string;
    templateName: string;
    languageCode: "en" | "hi";
    variables: string[];
  }): Promise<{ ok: boolean; provider: string; messageId?: string }>;
}

export class ResendEmailService implements EmailProvider {
  private apiKey = process.env.RESEND_API_KEY;
  private fromAddress = process.env.EMAIL_FROM || "Orbit Ops <ops@orbitcore.in>";

  async sendDailyDigest(payload: DailyDigestPayload) {
    if (!this.apiKey) {
      return {
        ok: true,
        provider: "simulated-resend (set RESEND_API_KEY in Vercel to send live emails)",
        id: `sim_digest_${Date.now()}`,
      };
    }

    const html = `
      <div style="font-family: Inter, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #666;">Orbit Media by Orbitcore</div>
        <h2 style="margin: 8px 0 16px;">9:00 AM IST Daily Priority Digest — ${payload.dateFormatted}</h2>
        <p>Namaste ${payload.recipientName}, here are your top priorities for today:</p>
        <ul>
          ${payload.priorityItems
            .map(
              (i) =>
                `<li style="margin-bottom: 8px;"><strong>${i.clientName}</strong>: ${i.title} <em>(${i.reasonSummary})</em></li>`
            )
            .join("")}
        </ul>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [payload.recipientEmail],
        subject: `[Orbit Ops] Today's Priorities — ${payload.dateFormatted}`,
        html,
      }),
    });

    if (!res.ok) {
      return { ok: false, provider: "resend" };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  }

  async sendUserInvite(params: { email: string; name: string; role: string; invitedBy: string }) {
    if (!this.apiKey) {
      return { ok: true, provider: "simulated-resend" };
    }
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [params.email],
        subject: `You're invited to Orbit Ops (Orbit Media by Orbitcore)`,
        html: `<p>Hi ${params.name}, ${params.invitedBy} invited you to Orbit Ops as <strong>${params.role}</strong>.</p>`,
      }),
    });
    return { ok: true, provider: "resend" };
  }
}

export class MetaWhatsAppCloudService implements WhatsAppCloudProvider {
  private accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  async sendTemplateReminder(params: {
    toPhone: string;
    templateName: string;
    languageCode: "en" | "hi";
    variables: string[];
  }) {
    if (!this.accessToken || !this.phoneNumberId) {
      return {
        ok: true,
        provider: "simulated-whatsapp-cloud-api",
        messageId: `wamid.sim_${Date.now()}`,
      };
    }

    const url = `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.toPhone.replace(/[^0-9]/g, ""),
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.languageCode },
          components: [
            {
              type: "body",
              parameters: params.variables.map((v) => ({ type: "text", text: v })),
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, provider: "meta-whatsapp-cloud" };
    }
    const json = (await res.json()) as { messages?: { id: string }[] };
    return {
      ok: true,
      provider: "meta-whatsapp-cloud",
      messageId: json.messages?.[0]?.id,
    };
  }
}

export const emailService: EmailProvider = new ResendEmailService();
export const whatsappService: WhatsAppCloudProvider = new MetaWhatsAppCloudService();
