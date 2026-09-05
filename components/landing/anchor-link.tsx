"use client";

import { useLenis } from "lenis/react";
import type { MouseEvent, ReactNode } from "react";

/** Roughly the height of the fixed navbar, so a section does not land
 *  underneath it. */
const NAV_OFFSET = -96;

/**
 * A link to a section of the current page.
 *
 * Not the locale-aware `Link`: for a bare hash that produces a client-side
 * navigation to "/en#section" which the App Router treats as a soft navigation
 * to the same route — it neither scrolls nor even sets the hash, so the link
 * silently does nothing.
 *
 * A plain anchor would work, but Lenis owns the scroll position on this page,
 * and a native jump would be an instant cut in the middle of an otherwise
 * smooth page. So the scroll is handed to Lenis, with the native behaviour
 * left in place as the fallback when Lenis is absent (it is not mounted on
 * every route, and it does nothing without JavaScript).
 */
export function AnchorLink({
  href,
  className,
  onClick,
  children,
}: {
  /** A same-page target, e.g. "#features". */
  href: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const lenis = useLenis();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle anything it would normally handle specially:
    // opening in a new tab, downloading, or a modified click.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = document.querySelector(href);
    // No such section on this page: fall through to the default behaviour
    // rather than swallowing the click.
    if (!target) return;

    event.preventDefault();
    onClick?.();

    // Someone who has asked for less motion should not be flown across four
    // screens of page. They still get taken there, just without the journey.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (lenis) {
      lenis.scrollTo(target as HTMLElement, {
        offset: NAV_OFFSET,
        duration: reduceMotion ? 0 : 1.2,
      });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }

    // Keep the address bar honest without pushing a history entry the back
    // button would then have to undo.
    window.history.replaceState(null, "", href);
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
