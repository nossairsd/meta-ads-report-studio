"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import SpotlightCard from "@/components/landing/spotlight-card";
import { SectionHeading } from "@/components/landing/section-heading";
import {
  BilingualVisual,
  ChartVisual,
  ConnectVisual,
  PdfVisual,
} from "@/components/landing/feature-visuals";

const reveal = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export default function Features() {
  const t = useTranslations("Landing.features");

  const cards = [
    {
      title: t("card1Title"),
      description: t("card1Description"),
      visual: <ConnectVisual label={t("card1MockLabel")} connected={t("card1MockConnected")} />,
      span: "lg:col-span-3",
    },
    {
      title: t("card2Title"),
      description: t("card2Description"),
      visual: <ChartVisual />,
      span: "lg:col-span-2",
    },
    {
      title: t("card3Title"),
      description: t("card3Description"),
      visual: <PdfVisual />,
      span: "lg:col-span-2",
    },
    {
      title: t("card4Title"),
      description: t("card4Description"),
      visual: <BilingualVisual />,
      span: "lg:col-span-3",
    },
  ];

  return (
    <section id="features" className="relative scroll-mt-28">
      {/* Dot grid, faded out towards the edges so it never competes with the cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 -bottom-16 -z-10"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(15,23,42,0.13) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 75%)",
        }}
      />

      <div className="mx-auto space-y-8 text-center md:space-y-10">
        <SectionHeading eyebrow={t("badge")} title={t("title")} description={t("description")} />

        <div className="grid grid-cols-1 gap-5 pt-4 lg:grid-cols-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              custom={i}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              className={`col-span-1 ${card.span}`}
            >
              <SpotlightCard>
                <h3 className="text-xl font-medium text-black md:text-title">{card.title}</h3>
                <p className="mt-3 text-sm text-foreground/70 lg:text-base">{card.description}</p>
                <div className="mt-6 flex flex-1 items-end">{card.visual}</div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
