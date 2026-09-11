"use client";

import { useState, useTransition } from "react";
import { updateRequestStatus } from "@/lib/admin/actions";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/admin/statuses";

const TONE: Record<RequestStatus, string> = {
  new: "border-primary/25 bg-primary/[0.06] text-primary",
  invited: "border-[#16A34A]/25 bg-[#16A34A]/[0.08] text-[#15803D]",
  declined: "border-black/[0.1] bg-black/[0.03] text-foreground/60",
};

/** Changes a request's status in place. The new value shows at once and is
 *  put back if the server refuses it — the list never claims a state it does
 *  not have. */
export function RequestStatusSelect({
  id,
  status,
  labels,
  ariaLabel,
  failedLabel,
}: {
  id: string;
  status: RequestStatus;
  labels: Record<RequestStatus, string>;
  ariaLabel: string;
  failedLabel: string;
}) {
  const [value, setValue] = useState<RequestStatus>(status);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function change(next: RequestStatus) {
    const previous = value;
    setValue(next);
    setFailed(false);
    startTransition(async () => {
      const result = await updateRequestStatus({ id, status: next });
      if (!result.ok) {
        setValue(previous);
        setFailed(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value}
        disabled={isPending}
        aria-label={ariaLabel}
        onChange={(e) => change(e.target.value as RequestStatus)}
        className={`h-10 w-full cursor-pointer rounded-full border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 ${TONE[value]}`}
      >
        {REQUEST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
      {failed && <span className="text-xs text-destructive">{failedLabel}</span>}
    </div>
  );
}
