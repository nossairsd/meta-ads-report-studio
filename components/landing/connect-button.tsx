"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { LogIn } from "lucide-react";
import SpecularButton from "@/components/landing/specular-button";
import { connectMeta } from "@/lib/auth/actions";

/**
 * Signing in with Meta.
 *
 * Deliberately always rendered, including on a deployment with no Meta
 * credentials: a missing call to action reads as a page that is broken or
 * unfinished, which is worse than a connection that fails with a clear
 * message. A missing configuration is handled where it actually is a problem —
 * on the server.
 *
 * Two shapes, because during the private beta signing in is not what a first
 * visitor should do: `ghost` is the quiet link in the navbar, for the agencies
 * already invited, while `solid` is the full call to action the hero will take
 * back once Meta's review opens the app to everyone.
 */
export function ConnectButton({
  label,
  pendingLabel,
  variant = "solid",
  className = "",
  onNavigate,
}: {
  label: string;
  pendingLabel: string;
  variant?: "solid" | "ghost";
  className?: string;
  /** Lets the mobile menu close itself as the redirect starts. */
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function connect() {
    onNavigate?.();
    startTransition(async () => void (await connectMeta(locale)));
  }

  if (variant === "ghost") {
    return (
      <button
        type="button"
        onClick={connect}
        disabled={isPending}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium text-black/70 transition-colors hover:bg-black/[0.05] hover:text-black disabled:opacity-60 ${className}`}
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {isPending ? pendingLabel : label}
      </button>
    );
  }

  return (
    <SpecularButton
      size="lg"
      baseColor="#FFFFFF"
      lineColor="#2563EB"
      textColor="#1F2937"
      radius={999}
      className={`w-full md:w-fit ${className}`}
      disabled={isPending}
      onClick={connect}
    >
      {isPending ? pendingLabel : label}
    </SpecularButton>
  );
}
