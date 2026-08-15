import "server-only";

import nodemailer from "nodemailer";

import type { MailAttachment } from "./email-templates";

// Single mail entry point so the transport (SMTP2GO today, Resend or
// anything else tomorrow) can be swapped without touching callers.
// Templates live in email-templates.ts (no server-only) so one-off
// Node scripts can render the same emails.

export { passwordResetEmail, invitationEmail } from "./email-templates";
export type { MailAttachment } from "./email-templates";

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

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}) {
  const from = process.env.SMTP_FROM ?? "EOS <data@loki-ventures.com>";
  await getTransport().sendMail({ from, ...opts });
}
