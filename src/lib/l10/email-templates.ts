import { EMAIL_BADGE_BASE64 } from "./email-badge";

// Pure template builders — no transport, no server-only import — so both
// server actions (via mail.ts) and one-off Node scripts can render them.

export interface MailAttachment {
  filename: string;
  content: string;
  encoding: "base64";
  contentType: string;
  contentDisposition: "inline";
  cid: string;
}

const ORANGE = "#f05100";
const FONT = "'Plus Jakarta Sans','Segoe UI',Arial,Helvetica,sans-serif";

function badgeAttachment(cid: string): MailAttachment {
  // The badge travels inside the message as an inline CID attachment —
  // remote image URLs are blocked or proxied by most mail clients, and
  // the bytes are baked in so nothing is fetched at send time.
  return {
    filename: "we-run-on-eos.png",
    content: EMAIL_BADGE_BASE64,
    encoding: "base64",
    contentType: "image/png",
    contentDisposition: "inline",
    cid,
  };
}

// Mirrors the light-mode login page: warm cream backdrop, white rounded
// card, EOS badge hero, letter-spaced eyebrow and the orange gradient CTA.
export function passwordResetEmail(name: string, resetUrl: string) {
  const firstName = name.trim().split(" ")[0] || "there";
  const badgeCid = "eos-badge";
  const attachments = [badgeAttachment(badgeCid)];

  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset your EOS Platform password.",
    "Open the link below to choose a new one. It expires in 1 hour and can only be used once.",
    "",
    resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email — your password is unchanged.",
  ].join("\n");

  const html = `
  <body style="margin:0;padding:0;background-color:#f7f4f0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4f0;padding:40px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background-color:#ffffff;border:1px solid #eee7de;border-radius:24px;box-shadow:0 12px 40px rgba(240,81,0,0.08)">
            <tr>
              <td style="padding:40px 36px;text-align:center;font-family:${FONT}">
                <img src="cid:${badgeCid}" alt="We run on EOS" width="120" style="display:block;margin:0 auto;height:auto" />
                <h1 style="margin:24px 0 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.01em;font-family:${FONT}">Reset your password</h1>
                <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;font-family:${FONT}">EOS Platform &middot; For LVL/PSK Teams</p>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#374151;text-align:left;font-family:${FONT}">Hi ${firstName},</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151;text-align:left;font-family:${FONT}">We received a request to reset your EOS Platform password. Click the button below to choose a new one. The link expires in <strong>1 hour</strong> and can only be used once.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
                  <tr>
                    <td align="center">
                      <a href="${resetUrl}" style="display:block;padding:13px 32px;border-radius:999px;background-color:${ORANGE};background-image:linear-gradient(to right,${ORANGE},#fb8c00,#fbbf24);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;font-family:${FONT}">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:left;font-family:${FONT}">If the button doesn't work, copy this link into your browser:<br/>
                  <a href="${resetUrl}" style="color:${ORANGE};word-break:break-all">${resetUrl}</a></p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;max-width:440px;font-size:12px;line-height:1.6;color:#9ca3af;font-family:${FONT};text-align:center">If you didn't request this, you can safely ignore this email — your password is unchanged.<br/>Accounts are provisioned by your team's super admin.</p>
        </td>
      </tr>
    </table>
  </body>`;

  return { subject: "Reset your EOS Platform password", html, text, attachments };
}

// Same shell as the reset email: cream backdrop, white card, badge hero,
// eyebrow and orange gradient CTA — only the copy and destination change.
// When a one-time password is supplied it is rendered in the message and
// the copy explains the forced change at first sign-in.
export function invitationEmail(
  name: string,
  loginUrl: string,
  oneTimePassword?: string,
) {
  const firstName = name.trim().split(" ")[0] || "there";
  const badgeCid = "eos-badge";
  const attachments = [badgeAttachment(badgeCid)];

  const text = [
    `Hi ${firstName},`,
    "",
    "Your account on the EOS Platform is ready — this is where our team runs Level 10 meetings, the Scorecard, Rocks, To-Dos and Issues.",
    ...(oneTimePassword
      ? [
          "Sign in with this email address and your one-time password:",
          "",
          `One-time password: ${oneTimePassword}`,
          "",
          "Type it exactly as shown — capital letters, dashes included (or copy & paste it).",
          "You'll be asked to set your own password the first time you sign in.",
        ]
      : ["Sign in with this email address and the password shared with you:"]),
    "",
    loginUrl,
    "",
    'Forgot or haven\'t received your password? Use "Forgot password" on the sign-in page and a reset link will be sent to you.',
    "",
    "If you weren't expecting this invitation, you can safely ignore this email.",
  ].join("\n");

  const otpBlock = oneTimePassword
    ? `
                <p style="margin:24px 0 0;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;font-family:${FONT}">Your one-time password</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0">
                  <tr>
                    <td align="center" style="background-color:#fff7f2;border:1px dashed ${ORANGE};border-radius:12px;padding:14px 12px">
                      <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:.12em;color:#111827">${oneTimePassword}</span>
                    </td>
                  </tr>
                </table>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:left;font-family:${FONT}">Type it <strong>exactly as shown</strong> — capital letters, dashes included (or copy &amp; paste it). You'll be asked to set your own password the first time you sign in.</p>`
    : "";

  const introCopy = oneTimePassword
    ? `Your account on the EOS Platform is ready — this is where our team runs <strong>Level&nbsp;10 meetings</strong>, the Scorecard, Rocks, To-Dos and Issues. Sign in with this email address and the one-time password below.`
    : `Your account on the EOS Platform is ready — this is where our team runs <strong>Level&nbsp;10 meetings</strong>, the Scorecard, Rocks, To-Dos and Issues. Sign in with this email address and the password shared with you.`;

  const html = `
  <body style="margin:0;padding:0;background-color:#f7f4f0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4f0;padding:40px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background-color:#ffffff;border:1px solid #eee7de;border-radius:24px;box-shadow:0 12px 40px rgba(240,81,0,0.08)">
            <tr>
              <td style="padding:40px 36px;text-align:center;font-family:${FONT}">
                <img src="cid:${badgeCid}" alt="We run on EOS" width="120" style="display:block;margin:0 auto;height:auto" />
                <h1 style="margin:24px 0 0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.01em;font-family:${FONT}">Welcome to the LVL/PSK EOS Platform</h1>
                <p style="margin:8px 0 0;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;font-family:${FONT}">EOS Platform &middot; For LVL/PSK Teams</p>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#374151;text-align:left;font-family:${FONT}">Hi ${firstName},</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#374151;text-align:left;font-family:${FONT}">${introCopy}</p>${otpBlock}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
                  <tr>
                    <td align="center">
                      <a href="${loginUrl}" style="display:block;padding:13px 32px;border-radius:999px;background-color:${ORANGE};background-image:linear-gradient(to right,${ORANGE},#fb8c00,#fbbf24);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;font-family:${FONT}">Sign in to EOS</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:left;font-family:${FONT}">Forgot or haven't received your password? Use <strong>Forgot password</strong> on the sign-in page and a reset link will be sent to you.<br/><br/>If the button doesn't work, copy this link into your browser:<br/>
                  <a href="${loginUrl}" style="color:${ORANGE};word-break:break-all">${loginUrl}</a></p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;max-width:440px;font-size:12px;line-height:1.6;color:#9ca3af;font-family:${FONT};text-align:center">If you weren't expecting this invitation, you can safely ignore this email.<br/>Accounts are provisioned by your team's super admin.</p>
        </td>
      </tr>
    </table>
  </body>`;

  return {
    subject: "LVL/PSK EOS Platform — your account & sign-in details",
    html,
    text,
    attachments,
  };
}
