/**
 * Capture guide screenshots from production as an HOD-level user.
 *
 * Signs a short-lived l10_session JWT (AUTH_SECRET from .env.local — same
 * secret as production) for an HOD account so the shots show exactly what
 * invitees will see: no Admin/Analytics tabs, Meeting greyed out.
 *
 * Usage: npx tsx --env-file=.env.local scripts/capture-screenshots.mts
 * Output: scripts/assets/screens/*.png
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

const BASE = "https://eos.rnd-loki.com";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "assets", "screens");

const PAGES: { path: string; name: string }[] = [
  { path: "/l10", name: "dashboard" },
  { path: "/l10/scorecard", name: "scorecard" },
  { path: "/l10/scorecard?view=trends", name: "scorecard-trends" },
  { path: "/l10/rocks", name: "rocks" },
  { path: "/l10/rocks?view=trends", name: "rocks-trends" },
  { path: "/l10/todos", name: "todos" },
  { path: "/l10/issues", name: "issues" },
];

async function signHodToken(): Promise<string> {
  const sql = neon(process.env.DATABASE_URL!);
  const [u] = await sql`
    select
      u.id, u.full_name, u.email, u.system_role, u.company_role,
      coalesce((
        select array_agg(b.short_name order by b.short_name)
        from core.user_business_access ba
        join core.businesses b on b.id = ba.business_id
        where ba.user_id = u.id), '{}') as companies
    from core.users u
    where u.user_code = '04'
  `;
  return new SignJWT({
    name: u.full_name,
    email: u.email,
    systemRole: u.system_role,
    companyRole: u.company_role,
    companies: u.companies,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.id)
    .setIssuedAt()
    .setExpirationTime("900s")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const token = await signHodToken();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--hide-scrollbars"],
  });

  try {
    const page = await browser.newPage();
    await browser.setCookie({
      name: "l10_session",
      value: token,
      domain: "eos.rnd-loki.com",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // Force light mode: next-themes reads localStorage first, and OS-level
    // dark preference is overridden for good measure.
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "light" },
    ]);
    await page.goto(`${BASE}/l10/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.evaluate(() => localStorage.setItem("theme", "light"));

    // Desktop shots
    await page.setViewport({ width: 1440, height: 860, deviceScaleFactor: 2 });
    for (const p of PAGES) {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle2", timeout: 60000 });
      // charts/feeds settle after hydration
      await new Promise((r) => setTimeout(r, 2500));
      await page.screenshot({ path: join(OUT, `${p.name}.png`) as `${string}.png` });
      console.log(`captured ${p.name}`);
    }

    // Phone shot of the login page (for the mobile install section)
    await page.setViewport({
      width: 390,
      height: 800,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(`${BASE}/l10/login`, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: join(OUT, "mobile-login.png") as `${string}.png` });
    console.log("captured mobile-login");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
