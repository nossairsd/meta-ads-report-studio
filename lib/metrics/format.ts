/**
 * Locale-aware formatting for everything the dashboard and the PDF display.
 *
 * Kept in one place so the two never drift apart: a figure shown as "4 281 €"
 * on screen must appear identically in the report a client receives.
 */

/**
 * Intl output is not byte-identical across ICU builds. Node 24 and Chrome
 * disagree on which Unicode space they emit — Node puts U+2009 (thin space)
 * around the dash of a formatted date range where Chrome puts U+0020, and
 * group separators vary between U+202F and U+00A0 depending on the build.
 *
 * Server HTML and client render have to match character for character or React
 * throws a hydration error, so every formatted string is normalised to one
 * non-breaking space before it reaches the DOM.
 */
export function normalizeSpaces(value: string): string {
  return value.replace(/[      ]/g, " ");
}

/** Cents to a currency string. Whole amounts drop the decimals — agency
 *  dashboards read better as "4 281 €" than "4 281,00 €". */
export function formatCurrencyCents(
  cents: number,
  locale: string,
  currency = "EUR"
): string {
  const amount = cents / 100;
  const hasFraction = cents % 100 !== 0;
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(amount)
  );
}

export function formatNumber(value: number, locale: string): string {
  return normalizeSpaces(new Intl.NumberFormat(locale).format(value));
}

/** Large counts as "812 k" / "1,2 M" so KPI cards stay legible at a glance. */
export function formatCompact(value: number, locale: string): string {
  if (Math.abs(value) < 10_000) return formatNumber(value, locale);
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  );
}

/** Signed percentage for trend indicators: "+12,4 %" / "-8 %". */
export function formatDelta(value: number, locale: string): string {
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      style: "percent",
      signDisplay: "exceptZero",
      maximumFractionDigits: 1,
    }).format(value / 100)
  );
}

export function formatShare(share: number, locale: string): string {
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(share)
  );
}

/**
 * A rate such as a click-through or conversion rate.
 *
 * Two decimals rather than the one `formatShare` uses: a CTR is typically
 * under 3%, where rounding to a tenth of a point throws away most of the
 * difference between a good campaign and a poor one.
 */
export function formatRate(rate: number, locale: string): string {
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate)
  );
}

/** "10 mars" / "10 Mar" — used for chart ticks, so no year. */
export function formatDayShort(isoDate: string, locale: string): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${isoDate}T00:00:00.000Z`))
  );
}

export function formatDayLong(isoDate: string, locale: string): string {
  return normalizeSpaces(
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${isoDate}T00:00:00.000Z`))
  );
}

/**
 * "7 août – 5 septembre 2026", dropping the year from the first date when both
 * fall in the same one.
 *
 * Composed by hand rather than with Intl.formatRange: that API's separator and
 * its decision to collapse shared components differ between ICU builds, which
 * is precisely what broke hydration here. Building the string ourselves keeps
 * it identical on the server and in every browser.
 */
export function formatDateRange(start: string, end: string, locale: string): string {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();

  const startFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });

  const startText = normalizeSpaces(startFormatter.format(startDate));
  const endText = formatDayLong(end, locale);

  return `${startText} – ${endText}`;
}
