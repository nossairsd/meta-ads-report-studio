"use client";

import { useTranslations } from "next-intl";
import SpecularButton from "@/components/landing/specular-button";
import { Link } from "@/i18n/navigation";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import GradientWaves from "@/components/effects/gradient-waves";
import TextBlurEffect from "@/components/effects/text-blur-effect";
import SlideEffect from "@/components/effects/slide-effect";
import FadeEffect from "@/components/effects/fade-effect";
import { ArrowRight } from "lucide-react";
import { AnchorLink } from "@/components/landing/anchor-link";

export default function Hero() {
  const t = useTranslations("Landing.hero");

  return (
    <div id="hero" className="relative z-10 space-y-12 md:space-y-20 lg:space-y-24">
      <div className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[720px] w-screen -translate-x-1/2">
        <GradientWaves
          horizonColor="#EFF6FF"
          waveColor="#3B82F6"
          crestColor="#DBEAFE"
          speed={0.3}
          amplitude={1.8}
          waveScale={0.55}
          waveRatio={0.9}
          swell={22}
          turbulence={12}
          fogDepth={50}
          opacity={0.9}
          mouseInteraction
          parallaxStrength={0.3}
          grain={false}
        />
        {/* Fade the wave into the white page instead of cutting off hard */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* The top padding clears the fixed navbar and then leaves the headline
          room to breathe — it used to be measured with the beta chip sitting
          above the title, and without it the headline came up under the nav.
          It grows with the screen, as the headline itself does. */}
      <section className="flex flex-col items-center gap-7 pt-32 text-center md:pt-40 lg:gap-10 lg:pt-48">
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
            <Link href="/demo" className="w-full md:w-fit">
              <SpecularButton
                size="lg"
                baseColor="#2563EB"
                lineColor="#93C5FD"
                textColor="#FFFFFF"
                radius={999}
                className="w-full gap-2 md:w-fit"
              >
                <span className="inline-flex items-center gap-2">
                  {t("ctaPrimary")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </SpecularButton>
            </Link>
            {/* During the private beta the second action is joining it, not
                signing in: a visitor who is not yet a tester would only meet
                Meta's "app unavailable" screen. Signing in lives in the
                navbar, where the invited agencies will look for it. */}
            <AnchorLink href="#early-access" className="w-full md:w-fit">
              <SpecularButton
                size="lg"
                baseColor="#FFFFFF"
                lineColor="#2563EB"
                textColor="#1F2937"
                radius={999}
                className="w-full md:w-fit"
              >
                {t("ctaRequest")}
              </SpecularButton>
            </AnchorLink>
          </div>

          <p className="text-xs text-foreground/50">{t("trustLine")}</p>

          {/* The beta, after the two main actions rather than above the headline:
              the headline states what the product is; this is news for the
              agencies who want in. */}
          <AnchorLink
            href="#early-access"
            className="group relative inline-flex max-w-full items-center gap-2.5 overflow-hidden rounded-full bg-white/85 p-1 pr-3.5 text-[13px] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-14px_rgba(37,99,235,0.55)] ring-1 ring-black/[0.06] backdrop-blur-md transition-shadow hover:ring-primary/30 sm:pr-4 sm:text-sm"
          >
            <span
              aria-hidden
              className="beta-chip-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/90 to-transparent"
            />
            <span className="relative shrink-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-white uppercase shadow-[0_4px_10px_-4px_rgba(37,99,235,0.8)]">
              {t("betaTag")}
            </span>
            {/* On a phone the chip keeps to the page margins: the call to
                action is the arrow, so the words for it can go. */}
            <span className="relative truncate font-medium text-foreground/75 transition-colors group-hover:text-black">
              {t("betaPill")}
              <span className="beta-chip-action"> · {t("betaPillAction")}</span>
            </span>
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.05] transition-colors group-hover:bg-primary group-hover:text-white">
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-px" />
            </span>
          </AnchorLink>
        </SlideEffect>

        <SlideEffect className="relative w-full px-4 md:px-0" isSpring={false} duration={1.2}>
          <DashboardPreview />
          <FadeEffect />
        </SlideEffect>
      </section>
    </div>
  );
}
