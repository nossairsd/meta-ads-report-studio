import { describe, it, expect } from "vitest";
import { csvCell, csvDelimiter, toCsv } from "@/lib/admin/csv";

describe("csvCell", () => {
  it("neutralises anything a spreadsheet would run as a formula", () => {
    for (const value of ["=HYPERLINK(\"http://evil\")", "+1+1", "-2", "@SUM(A1)"]) {
      expect(csvCell(value).replace(/^"/, "").startsWith("'")).toBe(true);
    }
  });

  it("quotes cells containing the separator, quotes or line breaks", () => {
    expect(csvCell("Dupont, Fils & Co")).toBe('"Dupont, Fils & Co"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("a;b", ";")).toBe('"a;b"');
    // A comma is ordinary text when the separator is a semicolon.
    expect(csvCell("rapports, suivi", ";")).toBe("rapports, suivi");
  });

  it("leaves ordinary text alone", () => {
    expect(csvCell("Café Atlas")).toBe("Café Atlas");
  });
});

describe("csvDelimiter", () => {
  it("uses the separator each locale's Excel expects", () => {
    expect(csvDelimiter("fr")).toBe(";");
    expect(csvDelimiter("en")).toBe(",");
  });
});

describe("toCsv", () => {
  it("starts with a byte-order mark so Excel reads accents as UTF-8", () => {
    const csv = toCsv([["name"], ["Élodie"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("name\r\nÉlodie\r\n");
  });

  it("joins columns with the chosen separator", () => {
    expect(toCsv([["Nom", "Agence"], ["Anna", "Studio Nova"]], ";").slice(1)).toBe(
      "Nom;Agence\r\nAnna;Studio Nova\r\n"
    );
  });
});
