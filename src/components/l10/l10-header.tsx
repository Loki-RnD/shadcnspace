"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Search, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { currentUser } from "@/components/l10/members";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

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
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}

export function L10Header() {
  return (
    <header className="l10-container">
      <div className="flex flex-wrap items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <Link href="/l10" className="flex items-center gap-2.5">
            <Image
              src="/images/l10/eos-logo.svg"
              alt="EOS"
              width={120}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <span className="text-muted-foreground border-border border-s ps-2.5 text-base font-semibold tracking-tight">
              HOD&nbsp;L10
            </span>
          </Link>

          <div className="border-border ms-2 hidden border-s ps-4 sm:block">
            <div className="relative w-xs">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search"
                className="h-9 pl-9"
                aria-label="Search"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 sm:gap-1">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <Bell className="size-5" />
            <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="rounded-full" />
              }
            >
              <Avatar className="size-7">
                <AvatarFallback
                  className={cn("text-xs font-medium", currentUser.color)}
                >
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{currentUser.name}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {currentUser.companyRole} · {currentUser.area}
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
    </header>
  );
}
