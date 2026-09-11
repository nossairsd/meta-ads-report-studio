"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import ParticleOrb from "@/components/effects/particle-orb";
import SpecularButton from "@/components/landing/specular-button";
import { AnchorLink } from "@/components/landing/anchor-link";
import { Link } from "@/i18n/navigation";

/** Headline revealed word by word out of a clipping mask. */
function AnimatedWords({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.09em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export default function CtaBand() {
  const t = useTranslations("Landing.cta");
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.4 });

  const orbY = useTransform(eased, [0, 1], ["14%", "-14%"]);
  const orbScale = useTransform(eased, [0, 0.5, 1], [0.78, 1.08, 0.92]);
  const contentY = useTransform(eased, [0, 1], ["7%", "-7%"]);
  const auroraX = useTransform(eased, [0, 1], ["-6%", "6%"]);

  const stats = [
    { value: t("stat1Value"), label: t("stat1Label") },
    { value: t("stat2Value"), label: t("stat2Label") },
    { value: t("stat3Value"), label: t("stat3Label") },
  ];

  return (
    <section
      ref={ref}
      className="relative isolate mt-24 overflow-hidden bg-[#070C16] py-28 md:mt-32 md:py-36"
    >
      {/* Aurora glows, drifting on their own and sliding with scroll */}
      <motion.div aria-hidden style={{ x: auroraX }} className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-[4%] h-[560px] w-[560px] rounded-full bg-[#2563EB]/30 blur-[140px]"
        />
        <motion.div
          animate={{ opacity: [0.3, 0.55, 0.3], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-48 left-[34%] h-[520px] w-[520px] rounded-full bg-[#0EA5E9]/22 blur-[140px]"
        />
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 60% 70% at 35% 50%, black 5%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 35% 50%, black 5%, transparent 72%)",
        }}
      />

      <motion.div
        style={{ y: orbY, scale: orbScale }}
        className="absolute inset-y-0 right-[-30%] -z-10 w-[85%] md:right-[-6%] md:w-[52%]"
      >
        <ParticleOrb />
      </motion.div>

      <motion.div
        style={{ y: contentY }}
        className="relative z-10 mx-auto w-full max-w-6xl px-6"
      >
        <div className="max-w-2xl">
          <h2 className="text-[2.25rem] leading-[1.08] font-medium tracking-tight text-white sm:text-5xl lg:text-[3.75rem]">
            <AnimatedWords text={t("title")} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-white/65 lg:text-xl"
          >
            {t("subtitle")}
          </motion.p>
        </div>

        {/* Concrete numbers instead of decorative feature pills */}
        <div className="mt-14 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: 0.4 + i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative border-l border-white/12 pl-5 sm:border-l-0 sm:border-t sm:pt-5 sm:pl-0"
            >
              <p className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="mt-14 flex flex-wrap items-center gap-4"
        >
          <Link href="/demo">
            <SpecularButton
              size="lg"
              baseColor="#2563EB"
              lineColor="#93C5FD"
              textColor="#FFFFFF"
              radius={999}
            >
              {t("button")}
            </SpecularButton>
          </Link>
          <AnchorLink
            href="#early-access"
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t("secondary")}
          </AnchorLink>
          <span className="text-sm text-white/40">{t("buttonNote")}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}
