import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/l10/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in — HOD L10",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (await getSessionUser()) redirect("/l10");

  const { from } = await searchParams;

  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Image
        src="/images/l10/eos-logo.svg"
        alt="HOD L10"
        width={48}
        height={48}
        priority
      />
      <LoginForm from={from} />
    </div>
  );
}
