/**
 * CSV for spreadsheet software, safe against formula injection.
 *
 * The rows come from a public form. A "name" such as =HYPERLINK(...) would be
 * executed by Excel or Sheets when the export is opened, so any cell starting
 * with a formula character is prefixed with an apostrophe, which spreadsheet
 * software reads as "this is text".
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string): string {
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** With a byte-order mark, so Excel opens accented names as UTF-8 rather than
 *  mangling them. */
export function toCsv(rows: string[][]): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
