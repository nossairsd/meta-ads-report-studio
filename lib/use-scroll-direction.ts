"use client";

import { useEffect, useState } from "react";

/**
 * Tracks scroll direction and whether the page has scrolled past a small
 * threshold. Used to hide the navbar on scroll-down and reveal it again on
 * scroll-up, while keeping it always visible near the very top of the page.
 */
export function useScrollDirection(threshold = 80) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);

      if (y < threshold) {
        setHidden(false);
      } else if (y > lastY) {
        setHidden(true);
      } else if (y < lastY) {
        setHidden(false);
      }

      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { hidden, scrolled };
}
