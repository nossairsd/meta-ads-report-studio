"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { FileText, Languages, Zap } from "lucide-react";
import PointGlobe from "@/components/effects/point-globe";
import SpecularButton from "@/components/landing/specular-button";

/** Headline revealed word by word rather than as one block. */
function AnimatedWords({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: i * 0.055, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
            {" "}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export default function CtaBand() {
  const t = useTranslations("Landing.footer");
  const ref = useRef<HTMLDivElement>(null);

  // Drives the parallax: 0 when the band enters the viewport, 1 when it leaves.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const globeY = useTransform(eased, [0, 1], ["12%", "-12%"]);
  const globeScale = useTransform(eased, [0, 0.5, 1], [0.82, 1.06, 0.94]);
  const contentY = useTransform(eased, [0, 1], ["8%", "-8%"]);
  const auroraX = useTransform(eased, [0, 1], ["-8%", "8%"]);

  const chips = [
    { icon: <FileText className="h-3.5 w-3.5" />, label: t("chipPages") },
    { icon: <Zap className="h-3.5 w-3.5" />, label: t("chipSpeed") },
    { icon: <Languages className="h-3.5 w-3.5" />, label: t("chipLangs") },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate overflow-hidden rounded-[36px] bg-[#080D18] px-8 py-20 md:px-16 md:py-24"
    >
      {/* Aurora: two slow-drifting glows that also slide with scroll */}
      <motion.div aria-hidden style={{ x: auroraX }} className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.12, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 left-[6%] h-[420px] w-[420px] rounded-full bg-[#2563EB]/30 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.35, 0.6, 0.35], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute -bottom-32 left-[38%] h-[380px] w-[380px] rounded-full bg-[#0EA5E9]/25 blur-[120px]"
        />
      </motion.div>

      {/* Fine grid, faded towards the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 65% 65% at 40% 50%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 65% at 40% 50%, black 10%, transparent 70%)",
        }}
      />

      {/* 3D globe, parallaxed and scaled by scroll position */}
      <motion.div
        style={{ y: globeY, scale: globeScale }}
        className="absolute inset-y-0 right-[-18%] -z-10 w-[80%] md:right-[-4%] md:w-[48%]"
      >
        <PointGlobe color="#1D4ED8" accent="#93C5FD" opacity={0.95} pointSize={9} />
      </motion.div>

      <motion.div style={{ y: contentY }} className="relative z-10 max-w-xl">
        <h2 className="text-3xl leading-[1.15] font-medium tracking-tight text-white md:text-[2.75rem]">
          <AnimatedWords text={t("ctaTitle")} />
        </h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-5 max-w-md text-sm text-white/55 lg:text-base"
        >
          {t("ctaSubtitle")}
        </motion.p>

        {/* Floating glass chips that keep breathing after they appear */}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {chips.map((chip, i) => (
            <motion.span
              key={chip.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ delay: 0.45 + i * 0.09, duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm"
            >
              <motion.span
                animate={{ y: [0, -2.5, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
                className="flex items-center gap-1.5"
              >
                {chip.icon}
                {chip.label}
              </motion.span>
            </motion.span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-9"
        >
          <SpecularButton
            size="lg"
            baseColor="#2563EB"
            lineColor="#93C5FD"
            textColor="#FFFFFF"
            radius={999}
          >
            {t("ctaButton")}
          </SpecularButton>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
