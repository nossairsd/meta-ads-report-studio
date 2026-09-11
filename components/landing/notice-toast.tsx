"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, Info, X } from "lucide-react";
import { AnchorLink } from "@/components/landing/anchor-link";

/** Long enough to read two lines; errors stay longer, being the ones a user
 *  may need to act on. Hovering or focusing pauses the countdown. */
const DURATION_MS = { info: 6_000, error: 10_000 };

/**
 * A notice that explains, then gets out of the way.
 *
 * It floats above the page instead of pushing the hero down, dismisses itself,
 * and removes the query parameter that raised it — otherwise a refresh, or a
 * shared link, would show "sign in required" again to someone who has since
 * signed in.
 */
export function NoticeToast({
  tone,
  title,
  body,
  dismissLabel,
  action,
}: {
  tone: "info" | "error";
  title: string;
  body: string;
  dismissLabel: string;
  /** The one thing that would resolve the notice, when there is one — a
   *  refused sign-in is only useful if it says what to do instead. */
  action?: { label: string; href: string };
}) {
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const remaining = useRef<number>(DURATION_MS[tone]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("signin");
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url);
  }, []);

  // The timer closes the notice; the bar below only shows it. An animation
  // end is not a reliable signal on its own: browsers skip animations in a
  // background tab or under reduced-motion settings, and the notice would
  // then never leave. Hovering or focusing pauses the timer and keeps the
  // time left.
  useEffect(() => {
    if (!open || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => setOpen(false), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [open, paused]);

  const isError = tone === "error";
  const Icon = isError ? AlertTriangle : Info;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role={isError ? "alert" : "status"}
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          // Above the navbar (z-50); full width on a phone, a card on the right
          // on wider screens.
          className="fixed inset-x-3 top-3 z-[60] overflow-hidden rounded-2xl border border-black/[0.07] bg-white/95 shadow-[0_18px_48px_-12px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:inset-x-auto sm:top-5 sm:right-5 sm:w-[400px]"
        >
          <div className="flex items-start gap-3 p-4">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-black">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/60">{body}</p>

              {action && (
                <AnchorLink
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </AnchorLink>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={dismissLabel}
              className="-mt-1 -mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-black/[0.05] hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* The countdown, visible: a notice that vanishes with no warning
              feels like a glitch. It runs and pauses with the timer above. */}
          <div className="h-[3px] w-full bg-black/[0.04]" aria-hidden>
            <div
              className={`h-full origin-left ${isError ? "bg-destructive" : "bg-primary"}`}
              style={{
                animation: `notice-countdown ${DURATION_MS[tone]}ms linear forwards`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
