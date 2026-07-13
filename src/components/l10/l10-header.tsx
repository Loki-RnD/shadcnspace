"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Search, Sun, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { l10NavItems } from "./nav-items";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}

export function L10Header() {
  const pathname = usePathname();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      {/* Row 1 — brand + actions */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/l10" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <Zap className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            HOD&nbsp;L10
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            EOS
          </Badge>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden md:block">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search…"
              className="h-9 w-56 pl-8"
              aria-label="Search"
            />
            <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">⌘K</Kbd>
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <Bell className="size-4" />
            <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full" />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs font-medium">
                  DB
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>Dennis Babu</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    Integrator
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Team settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2 — horizontal nav rail */}
      <nav
        aria-label="L10 sections"
        className="mx-auto max-w-7xl px-4 sm:px-6"
      >
        <ul className="scrollbar-none -mb-px flex items-center gap-1 overflow-x-auto">
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
                    "text-muted-foreground hover:text-foreground flex items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
                    active && "border-primary text-foreground",
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
    </header>
  );
}
