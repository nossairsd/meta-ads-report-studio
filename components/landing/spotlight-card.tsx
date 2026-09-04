"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

/**
 * Card shell with a blue spotlight that tracks the cursor. The position is
 * pushed into CSS custom properties rather than React state so moving the
 * mouse never triggers a re-render.
 */
export default function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative h-full overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.10)] transition-all duration-300 hover:border-black/[0.12] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-14px_rgba(37,99,235,0.20)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(37,99,235,0.10), transparent 62%)",
        }}
      />
      <div className="relative z-10 flex h-full flex-col p-8 text-start md:p-10">{children}</div>
    </div>
  );
}
