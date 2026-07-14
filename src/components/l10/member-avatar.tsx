import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { L10Member } from "./members";

export function MemberAvatar({
  member,
  size,
  className,
}: {
  member: L10Member;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Avatar data-size={size} className={className}>
            <AvatarFallback className={cn("font-medium", member.color)}>
              {member.initials}
            </AvatarFallback>
          </Avatar>
        }
      />
      <TooltipContent>
        {member.name} · {member.area}
      </TooltipContent>
    </Tooltip>
  );
}

export function MemberStack({
  members,
  max = 5,
  size,
  className,
}: {
  members: L10Member[];
  max?: number;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <AvatarGroup className={className}>
      {visible.map((member) => (
        <MemberAvatar
          key={member.id}
          member={member}
          size={size}
          className="ring-background ring-2 transition-transform hover:-translate-y-0.5"
        />
      ))}
      {overflow > 0 && (
        <AvatarGroupCount
          data-size={size}
          className="text-foreground font-medium"
        >
          +{overflow}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}
