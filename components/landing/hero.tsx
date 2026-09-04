"use client";

import { useTranslations } from "next-intl";
import Navbar from "@/components/landing/navbar";
import { MotionButton } from "@/components/landing/motion-button";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import TextBlurEffect from "@/components/effects/text-blur-effect";
import SlideEffect from "@/components/effects/slide-effect";
import FadeEffect from "@/components/effects/fade-effect";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <div id="hero" className="relative z-10 space-y-12 md:space-y-20 lg:space-y-24">
      <Navbar />

      <section className="flex flex-col items-center gap-7 text-center lg:gap-10">
        <h1 className="text-4xl leading-none font-medium tracking-tight text-black md:text-6xl lg:text-hero xl:max-w-4xl">
          <TextBlurEffect className="bg-gradient-to-b from-black to-black/60 bg-clip-text text-transparent">
            {t("title")}
          </TextBlurEffect>
        </h1>

        <SlideEffect
          delay={0}
          className="mx-auto max-w-2xl px-6 text-sm text-foreground/70 sm:px-10 md:px-0 lg:text-base"
        >
          {t("subtitle")}
        </SlideEffect>

        <SlideEffect className="flex w-full flex-col items-center justify-center gap-5 md:w-fit">
          <div className="mt-1 flex w-full flex-col items-center justify-center gap-3 md:flex-row md:gap-4">
            <MotionButton size="lg" className="w-full gap-2 md:w-fit">
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </MotionButton>
            <MotionButton size="lg" variant="outline" className="w-full md:w-fit">
              {t("ctaSecondary")}
            </MotionButton>
          </div>

          <p className="text-xs text-foreground/50">{t("trustLine")}</p>
        </SlideEffect>

        <SlideEffect className="relative w-full px-4 md:px-0" isSpring={false} duration={1.2}>
          <DashboardPreview />
          <FadeEffect />
        </SlideEffect>
      </section>
    </div>
  );
}
