"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disconnect } from "@/lib/auth/actions";

export function DisconnectButton({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await disconnect(locale)))}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </Button>
  );
}
