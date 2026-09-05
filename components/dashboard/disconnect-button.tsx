"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disconnect } from "@/lib/auth/actions";

export function DisconnectButton({ label }: { label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isPending}
      onClick={() => startTransition(async () => void (await disconnect()))}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </Button>
  );
}
