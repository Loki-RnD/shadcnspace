"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SNOOZE_KEY = "l10_rating_snooze_until";
const SNOOZE_DAYS = 7;
const SHOW_AFTER_MS = 20_000;

/**
 * Optional periodic UX rating. The server only sets `shouldPrompt` when the
 * user hasn't rated in the last 30 days; "Maybe later" snoozes locally for a
 * week. Entirely dismissable — never blocks work.
 */
export function RatingPrompt({ shouldPrompt }: { shouldPrompt: boolean }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shouldPrompt) return;
    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Date.now() < snoozedUntil) return;
    const timer = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [shouldPrompt]);

  function snooze() {
    localStorage.setItem(
      SNOOZE_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
    setOpen(false);
  }

  async function submit() {
    if (score < 1) return;
    setSubmitting(true);
    try {
      await fetch("/api/l10/analytics", {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              kind: "rating",
              score,
              comment: comment.trim() || undefined,
              path: window.location.pathname,
            },
          ],
        }),
      });
      toast("Thanks for the feedback!");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : snooze())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How is EOS working for you?</DialogTitle>
          <DialogDescription>
            A quick optional rating helps us improve the platform. Feel free to
            skip.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex items-center justify-center gap-1 py-2"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Rate ${value} of 5`}
              data-track={`rating-star-${value}`}
              onMouseEnter={() => setHovered(value)}
              onClick={() => setScore(value)}
              className="p-1"
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  (hovered || score) >= value
                    ? "fill-[#f05100] text-[#f05100]"
                    : "text-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything we should improve? (optional)"
          rows={3}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={snooze} data-track="rating-later">
            Maybe later
          </Button>
          <Button
            onClick={submit}
            disabled={score < 1 || submitting}
            data-track="rating-submit"
          >
            {submitting ? "Sending…" : "Send rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
