"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { l10NavItems } from "./nav-items";

export function L10Nav() {
  const pathname = usePathname();

  return (
    <div className="bg-background border-border sticky top-0 z-40 container mx-auto mt-2 rounded-lg border px-2 py-2">
      <nav aria-label="L10 sections">
        <ul className="flex items-center gap-1 overflow-x-auto md:flex-nowrap">
          {l10NavItems.map((item) => {
            const active =
              item.href === "/l10"
                ? pathname === "/l10"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap capitalize transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
