/**
 * Email the Quick Start Guide (no OTP/invite mechanics) to existing users.
 * Usage: npx tsx --env-file=.env.local scripts/send-guide.mts <name>:<email> [...]
 *   e.g. scripts/send-guide.mts "Taha:taham@loki-ventures.com"
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import nodemailer from "nodemailer";

const GUIDE_PDF = join(
  dirname(fileURLToPath(import.meta.url)),
  "assets",
  "quick-start-guide.pdf",
);

const FONT = "'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif";

function buildHtml(firstName: string) {
  return `
<body style="margin:0;padding:0;background-color:#f7f4f0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4f0;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background-color:#ffffff;border:1px solid #eee7de;border-radius:24px;box-shadow:0 12px 40px rgba(240,81,0,0.08)">
        <tr><td style="padding:36px;text-align:left;font-family:${FONT}">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827">EOS Platform — Quick Start Guide</h1>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase">EOS Platform &middot; For LVL/PSK Teams</p>
          <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#374151">Hi ${firstName},</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151">The HOD invites went out today — attached is the Quick Start Guide that was shared with them, for your reference. It covers first sign-in, each module (with screenshots), what auto-syncs from SAP, what's in development, and how to add the platform to a phone home screen.</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151">It's also hosted at <a href="https://eos.rnd-loki.com/guides/eos-quick-start.pdf" style="color:#f05100">eos.rnd-loki.com/guides/eos-quick-start.pdf</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>`;
}

async function main() {
  const recipients = process.argv.slice(2).map((arg) => {
    const idx = arg.indexOf(":");
    if (idx < 1) throw new Error(`Bad recipient "${arg}" — expected name:email`);
    return { name: arg.slice(0, idx), email: arg.slice(idx + 1) };
  });
  if (recipients.length === 0) throw new Error("Usage: send-guide.mts <name>:<email> [...]");

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD,
    },
  });

  for (const r of recipients) {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "EOS <data@loki-ventures.com>",
      to: r.email,
      subject: "LVL/PSK EOS Platform — Quick Start Guide (HOD rollout is live)",
      text: `Hi ${r.name},\n\nThe HOD invites went out today — attached is the Quick Start Guide shared with them, for your reference. Also hosted at https://eos.rnd-loki.com/guides/eos-quick-start.pdf.`,
      html: buildHtml(r.name),
      attachments: [
        {
          filename: "EOS Platform - Quick Start Guide.pdf",
          path: GUIDE_PDF,
          contentType: "application/pdf",
        },
      ],
    });
    console.log(`sent to ${r.email}`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
