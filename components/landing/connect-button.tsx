"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import SpecularButton from "@/components/landing/specular-button";
import { connectMeta } from "@/lib/auth/actions";

/**
 * The "Connect with Facebook" call to action.
 *
 * Split out of the hero because it needs a transition and a server action.
 *
 * It is deliberately always rendered, including on a deployment with no Meta
 * credentials. The landing page is the product's shop window, and a missing
 * call to action reads as a page that is broken or unfinished — worse than a
 * connection that fails with a clear message. A missing configuration is
 * handled where it actually is a problem: on the server.
 */
export function ConnectButton() {
  const t = useTranslations("Landing.hero");
  const [isPending, startTransition] = useTransition();

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
