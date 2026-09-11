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
import { ConnectButton } from "@/components/landing/connect-button";
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

      <section className="flex flex-col items-center gap-7 pt-24 text-center lg:gap-10">
        <SlideEffect delay={0}>
          <AnchorLink
            href="#early-access"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-3.5 py-1.5 text-xs font-medium text-primary shadow-[0_4px_16px_-8px_rgba(37,99,235,0.45)] backdrop-blur-md transition-colors hover:bg-white sm:text-sm"
          >
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {t("betaPill")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </AnchorLink>
        </SlideEffect>

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
            <ConnectButton />
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
