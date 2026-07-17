import "./globals.css";
import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Montserrat,
  Lora,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "EOS — Loki Ventures",
  description:
    "Loki Ventures EOS platform: Level 10 meetings, Scorecard, Rocks, To-Dos and Issues.",
  icons: [{ url: "/images/l10/eos-bulb.png", type: "image/png", rel: "icon" }],
  metadataBase: new URL("https://hod-l10.rnd-loki.com"),
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${jetbrainsMono.variable} ${montserrat.variable} ${lora.variable}`}
    >
      <body>
        <Toaster position="top-center" />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}