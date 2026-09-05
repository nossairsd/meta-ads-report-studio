"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { CalendarRange, FileDown, PlugZap } from "lucide-react";

const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

/**
 * The three steps between an ad account and a finished report.
 *
 * The navbar and the footer have always linked to #how-it-works; until now
 * nothing on the page carried that id, so both links did nothing. It also
 * fills a real gap: the page went straight from what the tool has to a request
 * to try it, without ever saying what using it involves.
 */
export default function HowItWorks() {
  const t = useTranslations("Landing.howItWorks");

  const steps = [
    { icon: PlugZap, title: t("step1Title"), description: t("step1Description") },
    { icon: CalendarRange, title: t("step2Title"), description: t("step2Description") },
    { icon: FileDown, title: t("step3Title"), description: t("step3Description") },
  ];

  return (
    <section id="how-it-works" className="relative scroll-mt-28">
      <div className="mx-auto space-y-8 text-center md:space-y-10">
        <motion.div
          custom={0}
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.07] bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-primary uppercase shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("badge")}
          </span>
        </motion.div>

        <motion.h2
          custom={1}
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="bg-gradient-to-b from-black to-black/60 bg-clip-text text-3xl leading-tight font-medium tracking-tight text-transparent md:text-4xl lg:text-5xl"
        >
          {t("title")}
        </motion.h2>

        <motion.p
          custom={2}
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto w-full px-2 text-sm text-foreground/70 sm:px-10 md:max-w-2xl md:px-0 lg:text-base"
        >
          {t("description")}
        </motion.p>

        <div className="relative pt-6">
          {/* The line the steps sit on. Drawn only from the third breakpoint up,
              where the steps are actually side by side; stacked on mobile it
              would run through the middle of the text. */}
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="pointer-events-none absolute top-[3.6rem] right-[16%] left-[16%] hidden h-px origin-left bg-gradient-to-r from-transparent via-primary/35 to-transparent md:block"
          />

          <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                custom={i}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.07)]">
                  <step.icon className="h-7 w-7 text-primary" strokeWidth={1.6} />
                  {/* The step number, so the order survives being read out of
                      sequence or on a narrow screen where the line is absent. */}
                  <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white shadow-sm">
                    {i + 1}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-medium text-black">{step.title}</h3>
                <p className="mt-2.5 max-w-xs text-sm text-foreground/65">{step.description}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
