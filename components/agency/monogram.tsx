/** Foreground and background pairs, distinct enough to tell clients apart in
 *  a long list at a glance. */
const PALETTE: [string, string][] = [
  ["#1D4ED8", "#DBEAFE"],
  ["#6D28D9", "#EDE9FE"],
  ["#0E7490", "#CFFAFE"],
  ["#15803D", "#DCFCE7"],
  ["#C2410C", "#FFEDD5"],
  ["#BE185D", "#FCE7F3"],
  ["#4338CA", "#E0E7FF"],
  ["#0F766E", "#CCFBF1"],
];

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.codePointAt(0)!) >>> 0;
  return h;
}

/** "Dupont & Co" → "DC", "Café Atlas" → "CA". Symbols are skipped. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => [...word.replace(/[^\p{L}\p{N}]/gu, "")][0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return letters.toUpperCase() || "?";
}

const SIZES = {
  sm: "h-6 w-6 rounded-md text-[10px]",
  md: "h-9 w-9 rounded-lg text-xs",
  lg: "h-12 w-12 rounded-xl text-sm",
};

/**
 * A client's badge. Agencies have no logo to hand for each client, and a
 * coloured monogram — the same colour everywhere for the same name — makes a
 * client recognisable across the sidebar, the overview and its own page.
 */
export function Monogram({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [fg, bg] = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center font-semibold tracking-wide ${SIZES[size]} ${className}`}
      style={{ color: fg, backgroundColor: bg }}
    >
      {initials(name)}
    </span>
  );
}
