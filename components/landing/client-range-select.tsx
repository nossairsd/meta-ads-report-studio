"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

/**
 * The client-range picker on the early-access form.
 *
 * A native <select> opens the operating system's own list — grey, square,
 * different on every browser — in the middle of an otherwise designed form.
 * This is Base UI's Select: the same keyboard behaviour and screen-reader
 * semantics as the native control (arrows, Enter, Escape, type-ahead), a list
 * styled like the rest of the page, and a hidden input named `name` so the
 * form's data is unchanged.
 */
export function ClientRangeSelect({
  id,
  name,
  placeholder,
  options,
  invalid = false,
  describedBy,
}: {
  id: string;
  name: string;
  placeholder: string;
  options: { value: string; label: string }[];
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <Select.Root name={name} items={Object.fromEntries(options.map((o) => [o.value, o.label]))}>
      <Select.Trigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`group flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left text-sm text-black outline-none transition-[border-color,box-shadow] focus-visible:ring-2 data-[popup-open]:ring-2 ${
          invalid
            ? "border-destructive/60 focus-visible:ring-destructive/25 data-[popup-open]:ring-destructive/25"
            : "border-black/[0.1] hover:border-black/[0.18] focus-visible:ring-primary/35 data-[popup-open]:border-primary/45 data-[popup-open]:ring-primary/20"
        }`}
      >
        <Select.Value
          placeholder={placeholder}
          className="truncate data-[placeholder]:text-foreground/40"
        />
        <Select.Icon className="flex text-foreground/40 transition-transform duration-200 group-data-[popup-open]:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        {/* Above the fixed navbar and the sign-in toast. */}
        <Select.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-[70] outline-none">
          <Select.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_44px_-18px_rgba(15,23,42,0.35),0_2px_6px_rgba(15,23,42,0.05)] outline-none transition-[transform,opacity] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm text-foreground/75 outline-none select-none data-[highlighted]:bg-primary/[0.07] data-[highlighted]:text-black data-[selected]:font-semibold data-[selected]:text-black"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="flex text-primary">
                    <Check className="h-4 w-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
