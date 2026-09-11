import type { ActivityStatus, CampaignStatus } from "@/lib/agency/types";

/**
 * Status pills. Colour carries the meaning at a glance, the label carries it
 * for everyone who cannot tell green from amber — so a pill is never colour
 * alone.
 */

type Tone = "green" | "amber" | "red" | "gray" | "blue";

const TONES: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: "bg-[#16A34A]/10 text-[#15803D]", dot: "bg-[#16A34A]" },
  amber: { pill: "bg-[#F59E0B]/12 text-[#B45309]", dot: "bg-[#F59E0B]" },
  red: { pill: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  gray: { pill: "bg-black/[0.05] text-foreground/60", dot: "bg-foreground/35" },
  blue: { pill: "bg-primary/10 text-primary", dot: "bg-primary" },
};

function Pill({ tone, label }: { tone: Tone; label: string }) {
  const { pill, dot } = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${pill}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

const ACTIVITY_TONE: Record<ActivityStatus, Tone> = {
  active: "green",
  paused: "amber",
  inactive: "gray",
};

export function ActivityBadge({ status, label }: { status: ActivityStatus; label: string }) {
  return <Pill tone={ACTIVITY_TONE[status]} label={label} />;
}

const CAMPAIGN_TONE: Record<CampaignStatus, Tone> = {
  active: "green",
  in_review: "blue",
  paused: "amber",
  with_issues: "red",
  rejected: "red",
  ended: "gray",
  archived: "gray",
};

export function CampaignStatusBadge({ status, label }: { status: CampaignStatus; label: string }) {
  return <Pill tone={CAMPAIGN_TONE[status]} label={label} />;
}
