"use client";

import { useTranslations } from "next-intl";
import Badge from "@/components/landing/badge";
import Card from "@/components/landing/card";
import SlideEffect from "@/components/effects/slide-effect";
import { CheckCircle2, Languages } from "lucide-react";
import { MotionButton } from "@/components/landing/motion-button";

export default function Features() {
  const t = useTranslations("Landing.features");

  return (
    <div id="features" className="mx-auto space-y-8 text-center md:space-y-10">
      <SlideEffect>
        <Badge number={1} text={t("badge")} />
      </SlideEffect>

      <SlideEffect>
        <h2 className="bg-gradient-to-b from-black to-black/60 bg-clip-text text-2xl leading-none font-medium text-transparent capitalize md:text-4xl lg:text-header">
          {t("title")}
        </h2>
      </SlideEffect>

      <SlideEffect className="mx-auto w-full px-2 text-sm sm:px-10 md:max-w-3/4 md:px-0 lg:text-base">
        {t("description")}
      </SlideEffect>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SlideEffect direction="right" isSpring={false} className="col-span-1 h-full lg:col-span-3">
          <Card className="items-start">
            <h3 className="text-xl font-medium text-black md:text-title">
              {t("card1Title")}
            </h3>
            <p>{t("card1Description")}</p>
            <div className="flex w-full items-center justify-between rounded-xl bg-white p-4">
              <span className="text-sm font-medium text-black/70">
                {t("card1MockLabel")}
              </span>
              <MotionButton size="sm" variant="outline" className="pointer-events-none gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                {t("card1MockConnected")}
              </MotionButton>
            </div>
          </Card>
        </SlideEffect>

        <SlideEffect
          direction="left"
          duration={1.3}
          isSpring={false}
          className="col-span-1 h-full lg:col-span-2"
        >
          <Card className="items-start">
            <h3 className="text-xl font-medium text-black md:text-title">
              {t("card2Title")}
            </h3>
            <p>{t("card2Description")}</p>
          </Card>
        </SlideEffect>

        <SlideEffect
          direction="right"
          duration={1}
          isSpring={false}
          className="col-span-1 h-full lg:col-span-2"
        >
          <Card className="items-start">
            <h3 className="text-xl font-medium text-black md:text-title">
              {t("card3Title")}
            </h3>
            <p>{t("card3Description")}</p>
          </Card>
        </SlideEffect>

        <SlideEffect direction="left" isSpring={false} className="col-span-1 h-full lg:col-span-3">
          <Card className="flex-row items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-black md:text-title">
                {t("card4Title")}
              </h3>
              <p>{t("card4Description")}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black/70 md:flex">
              <Languages className="h-4 w-4 text-primary" />
              FR / EN
            </div>
          </Card>
        </SlideEffect>
      </div>
    </div>
  );
}
