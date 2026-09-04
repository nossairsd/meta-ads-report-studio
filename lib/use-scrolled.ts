"use client";

import { useCallback, useEffect, useState } from "react";
import { useLenis } from "lenis/react";

/**
 * True once the page has scrolled past `threshold` pixels.
 *
 * Lenis drives scrolling itself and does not emit native `scroll` events on
 * window, so subscribing to Lenis is the path that actually fires here. The
 * window listener stays as a fallback for any tree rendered outside the Lenis
 * provider (and for tests).
 */
export function useScrolled(threshold = 16) {
  const [scrolled, setScrolled] = useState(false);

  const handle = useCallback(
    (y: number) => {
      setScrolled(y > threshold);
    },
    [threshold]
  );

  useLenis((lenis) => handle(lenis.scroll), [handle]);

  useEffect(() => {
    const onScroll = () => handle(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [handle]);

  return scrolled;
}
