import { AlertTriangle, CalendarSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the first fetch is in flight. Mirrors the real layout so the
 *  page does not jump when data lands. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3.5 h-8 w-28" />
            <Skeleton className="mt-3.5 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-6 lg:col-span-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-[240px] w-full" />
        </div>
        <div className="rounded-2xl border border-black/[0.07] bg-white p-6 lg:col-span-2">
          <Skeleton className="h-4 w-36" />
          <div className="mt-6 flex items-center gap-5">
            <Skeleton className="h-[150px] w-[150px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The account is reachable but has nothing to show for this window —
 *  a different situation from an error, and it must not look like one. */
export function DashboardEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.12] bg-white/60 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground/50">
        <CalendarSearch className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-medium text-black">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-foreground/60">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="lg" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Something actually failed: the API refused, the quota is spent, or the
 *  session expired. Always offers a way out rather than a dead end. */
export function DashboardErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  detail,
}: {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void;
  /** Technical detail, shown small — useful when a user reports a problem. */
  detail?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/[0.04] px-6 py-20 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-medium text-black">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-foreground/60">{description}</p>
      <Button size="lg" className="mt-6 gap-2" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </Button>
      {detail && (
        <p className="mt-5 max-w-md font-mono text-[11px] break-words text-foreground/35">
          {detail}
        </p>
      )}
    </div>
  );
}
