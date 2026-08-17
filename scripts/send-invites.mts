/**
 * Send EOS Platform invite emails with one-time passwords to HOD users.
 *
 * Usage (from l10-platform/frontend, reads .env.local):
 *   npx tsx --env-file=.env.local scripts/send-invites.mts --test you@example.com
 *   npx tsx --env-file=.env.local scripts/send-invites.mts --live
 *
 * --test  Renders a sample invite (no database writes) and sends it to the
 *         given address so the email can be reviewed before the real run.
 * --live  For every active hod user except the excluded super admins:
 *         generates a fresh one-time password, stores its bcrypt hash with
 *         must_change_password = true, voids outstanding reset links and
 *         emails the invite. The middleware then forces a password change
 *         at first sign-in.
 */
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

import { invitationEmail } from "../src/lib/l10/email-templates";

const GUIDE_PDF = join(
  dirname(fileURLToPath(import.meta.url)),
  "assets",
  "EOS-Platform-Quick-Start.pdf",
);

const LOGIN_URL = "https://eos.rnd-loki.com/l10/login";
// Already using the system — no invite, passwords untouched.
const EXCLUDED_EMAILS = ["dennisn@loki-ventures.com", "taham@loki-ventures.com"];

// Unambiguous alphabet (no 0/O, 1/I/L) — HODs will type this by hand.
const OTP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateOtp(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => OTP_ALPHABET[b % OTP_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS are not set");
  }
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

async function sendInvite(
  to: string,
  name: string,
  otp: string,
  subjectPrefix = "",
) {
  const mail = invitationEmail(name, LOGIN_URL, otp);
  const from = process.env.SMTP_FROM ?? "EOS <data@loki-ventures.com>";
  await getTransport().sendMail({
    from,
    to,
    ...mail,
    subject: `${subjectPrefix}${mail.subject}`,
    attachments: [
      ...mail.attachments,
      {
        filename: "EOS Platform - Quick Start Guide.pdf",
        path: GUIDE_PDF,
        contentType: "application/pdf",
      },
    ],
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--test") {
    const to = args[1];
    if (!to) throw new Error("Usage: --test <email>");
    const otp = generateOtp();
    await sendInvite(to, "Dennis Babu", otp, "[TEST] ");
    console.log(`Test invite sent to ${to}`);
    console.log(`Sample one-time password shown in the email: ${otp}`);
    console.log("No database changes were made.");
    return;
  }

  if (args[0] !== "--live") {
    throw new Error("Pass --test <email> or --live");
  }

  const sql = neon(process.env.DATABASE_URL!);
  const users = (await sql`
    select id, user_code, full_name, email
    from core.users
    where active
      and system_role = 'hod'
      and lower(email) not in (${EXCLUDED_EMAILS[0]}, ${EXCLUDED_EMAILS[1]})
    order by user_code
  `) as { id: string; user_code: string; full_name: string; email: string }[];

  if (users.length === 0) {
    console.log("No eligible HOD users found — nothing to do.");
    return;
  }

  console.log(`Sending invites to ${users.length} HOD user(s)...\n`);
  const results: { name: string; email: string; otp: string; status: string }[] = [];

  for (const u of users) {
    const otp = generateOtp();
    try {
      await sql`
        update core.users
        set password_hash = crypt(${otp}, gen_salt('bf')),
            must_change_password = true
        where id = ${u.id}
      `;
      // Outstanding email-reset links would bypass the one-time flow — void them.
      await sql`
        delete from core.password_reset_tokens
        where user_id = ${u.id} and used_at is null
      `;
      await sendInvite(u.email, u.full_name, otp);
      results.push({ name: u.full_name, email: u.email, otp, status: "sent" });
      console.log(`  [${u.user_code}] ${u.full_name} <${u.email}> — sent`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ name: u.full_name, email: u.email, otp, status: `FAILED: ${msg}` });
      console.error(`  [${u.user_code}] ${u.full_name} <${u.email}> — FAILED: ${msg}`);
    }
  }

  console.log("\nSummary (keep the OTPs somewhere safe until first login):");
  console.table(results);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
