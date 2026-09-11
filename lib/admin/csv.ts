/**
 * CSV for spreadsheet software, safe against formula injection.
 *
 * The rows come from a public form. A "name" such as =HYPERLINK(...) would be
 * executed by Excel or Sheets when the export is opened, so any cell starting
 * with a formula character is prefixed with an apostrophe, which spreadsheet
 * software reads as "this is text".
 */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * The separator Excel expects depends on the user's regional settings: a
 * comma in English, a semicolon in French (where the comma is the decimal
 * mark). With the wrong one Excel puts each whole row into column A.
 */
export function csvDelimiter(locale: string): "," | ";" {
  return locale === "fr" ? ";" : ",";
}

export function csvCell(value: string, delimiter: "," | ";" = ","): string {
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

/** With a byte-order mark, so Excel opens accented names as UTF-8 rather than
 *  mangling them. */
export function toCsv(rows: string[][], delimiter: "," | ";" = ","): string {
  return (
    "﻿" +
    rows.map((row) => row.map((cell) => csvCell(cell, delimiter)).join(delimiter)).join("\r\n") +
    "\r\n"
  );
}
