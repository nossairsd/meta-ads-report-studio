"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import SpecularButton from "@/components/landing/specular-button";
import { connectMeta } from "@/lib/auth/actions";

/**
 * The "Connect with Facebook" call to action.
 *
 * Split out of the hero because it needs a transition and a server action,
 * and because it is the one control on the page that can be genuinely
 * unavailable: a demo-only deployment has no Meta credentials, and offering a
 * button that leads to a broken OAuth screen is worse than not offering it.
 */
export function ConnectButton({ canConnect }: { canConnect: boolean }) {
  const t = useTranslations("Landing.hero");
  const [isPending, startTransition] = useTransition();

  if (!canConnect) return null;

  return (
    <SpecularButton
      size="lg"
      baseColor="#FFFFFF"
      lineColor="#2563EB"
      textColor="#1F2937"
      radius={999}
      className="w-full md:w-fit"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await connectMeta()))}
    >
      {isPending ? t("ctaSecondaryPending") : t("ctaSecondary")}
    </SpecularButton>
  );
}
