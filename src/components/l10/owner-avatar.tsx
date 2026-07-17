"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AVATAR_TINTS = [
  "bg-[#f05100]/15 text-[#f05100]",
  "bg-[#009588]/15 text-[#009588]",
  "bg-[#104e64]/15 text-[#104e64] dark:text-[#7fb6c9]",
  "bg-[#fcbb00]/20 text-[#8a6700] dark:text-[#fcbb00]",
  "bg-[#f99c00]/15 text-[#b06e00] dark:text-[#f99c00]",
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function OwnerAvatar({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  if (!name) {
    return (
      <span
        className={cn(
          "bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]",
          className,
        )}
      >
        —
      </span>
    );
  }
  const tint =
    AVATAR_TINTS[
      Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) %
        AVATAR_TINTS.length
    ];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
              tint,
              className,
            )}
          />
        }
      >
        {initials(name)}
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
