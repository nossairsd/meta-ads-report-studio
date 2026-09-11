"use client";

import { motion } from "motion/react";
import { Check, FileText } from "lucide-react";
import Image from "next/image";

const inView = { once: true, amount: 0.4 } as const;

/** Facebook account → app, with the link drawing itself and a check popping in. */
export function ConnectVisual({ label, connected }: { label: string; connected: string }) {
  return (
    <div className="relative flex w-full items-center justify-center gap-4 rounded-2xl bg-slate-50/80 px-5 py-7">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.76 8.45-4.92 8.45-9.94Z" />
        </svg>
      </div>

      <div className="relative h-px flex-1 overflow-hidden">
        <div className="absolute inset-0 border-t border-dashed border-slate-300" />
        <motion.div
          animate={{ x: ["-100%", "120%"] }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
          className="absolute top-1/2 h-1.5 w-8 -translate-y-1/2 rounded-full bg-primary/70 blur-[1px]"
        />
      </div>

      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <Image src="/logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={inView}
          transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.55 }}
          className="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#16A34A] text-white shadow"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </motion.span>
      </div>

      <span className="sr-only">
        {label} — {connected}
      </span>
    </div>
  );
}

/** Bars growing + a sparkline drawing itself. */
export function ChartVisual() {
  const bars = [38, 62, 46, 78, 58, 92, 70];

  return (
    <div className="w-full rounded-2xl bg-slate-50/80 p-5">
      <div className="flex h-28 items-end justify-between gap-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 6, opacity: 0.4 }}
            whileInView={{ height: `${h}%`, opacity: 1 }}
            viewport={inView}
            transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full rounded-md ${i === 5 ? "bg-primary" : "bg-primary/25"}`}
          />
        ))}
      </div>

      <svg viewBox="0 0 240 40" className="mt-3 h-8 w-full" fill="none" preserveAspectRatio="none">
        <motion.polyline
          points="0,34 40,26 80,30 120,16 160,20 200,8 240,12"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={inView}
          transition={{ duration: 1.1, ease: "easeInOut", delay: 0.25 }}
        />
      </svg>
    </div>
  );
}

/** A report sliding into place on top of the previous ones. */
export function PdfVisual() {
  return (
    <div className="flex w-full items-center justify-center rounded-2xl bg-slate-50/80 px-5 py-7">
      <div className="relative h-28 w-24">
        {[2, 1, 0].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14, rotate: 0 }}
            whileInView={{ opacity: 1, y: -i * 5, rotate: (i - 1) * 6 }}
            viewport={inView}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: (2 - i) * 0.12 }}
            style={{ zIndex: 3 - i }}
            className="absolute inset-0 flex flex-col gap-1.5 rounded-lg border border-black/[0.07] bg-white p-3 shadow-sm"
          >
            {i === 0 && (
              <>
                <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold tracking-wide text-primary">
                  <FileText className="h-3 w-3" />
                  PDF
                </div>
                <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                <div className="h-1.5 w-3/5 rounded bg-slate-200" />
                <div className="mt-1 flex items-end gap-1">
                  <div className="h-5 w-2 rounded-sm bg-primary/30" />
                  <div className="h-8 w-2 rounded-sm bg-primary/60" />
                  <div className="h-6 w-2 rounded-sm bg-primary/40" />
                  <div className="h-10 w-2 rounded-sm bg-primary" />
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** FR / EN indicator sliding back and forth on a loop. */
export function BilingualVisual() {
  const loop = {
    duration: 4,
    times: [0, 0.35, 0.65, 1],
    repeat: Infinity,
    ease: "easeInOut" as const,
  };
  const white = "rgb(255,255,255)";
  const slate = "rgb(100,116,139)";

  return (
    <div className="flex w-full items-center justify-center rounded-2xl bg-slate-50/80 px-5 py-7">
      <div className="relative flex items-center rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-black/[0.06]">
        {/* Continuous loops use `animate`, not `whileInView`: motion does not
            reliably (re)start repeating keyframes on viewport entry. */}
        <motion.span
          aria-hidden
          animate={{ x: [0, 52, 52, 0] }}
          transition={loop}
          className="absolute left-1 h-[30px] w-[52px] rounded-full bg-primary"
        />
        {/* Label colours follow the same keyframe timing as the pill, so the
            active one is always white and the inactive one stays readable. */}
        <motion.span
          animate={{ color: [white, slate, slate, white] }}
          transition={loop}
          className="relative z-10 w-[52px] py-1 text-center"
        >
          FR
        </motion.span>
        <motion.span
          animate={{ color: [slate, white, white, slate] }}
          transition={loop}
          className="relative z-10 w-[52px] py-1 text-center"
        >
          EN
        </motion.span>
      </div>
    </div>
  );
}
