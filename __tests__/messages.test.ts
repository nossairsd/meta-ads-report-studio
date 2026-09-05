import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

/**
 * Translation files drift silently: a key added to one language renders as its
 * own raw key in the other, and nobody notices until a French user sees
 * "Dashboard.failure.expired.title" on screen. These tests fail instead.
 */

type Messages = Record<string, unknown>;

/** Every leaf path, e.g. "Dashboard.failure.expired.title". */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value as Messages).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

const enPaths = leafPaths(en).sort();
const frPaths = leafPaths(fr).sort();

describe("translation files", () => {
  it("define exactly the same keys", () => {
    expect(frPaths).toEqual(enPaths);
  });

  it("has no empty strings, which render as a blank space in the UI", () => {
    for (const [locale, messages] of [
      ["en", en],
      ["fr", fr],
    ] as const) {
      for (const path of leafPaths(messages)) {
        const value = path
          .split(".")
          .reduce<unknown>((node, key) => (node as Messages)[key], messages);
        expect(String(value).trim(), `${locale}: ${path} is empty`).not.toBe("");
      }
    }
  });

  it("uses the same interpolation placeholders in both languages", () => {
    // {name} translated as {nom} throws at render time rather than degrading.
    const placeholders = (messages: unknown, path: string) => {
      const value = path
        .split(".")
        .reduce<unknown>((node, key) => (node as Messages)[key], messages);
      return (String(value).match(/\{(\w+)\}/g) ?? []).sort();
    };

    for (const path of enPaths) {
      expect(placeholders(fr, path), `mismatch at ${path}`).toEqual(placeholders(en, path));
    }
  });

  it("covers every failure kind the dashboard can produce", async () => {
    // The mapping and the strings are edited in different files; this is what
    // stops one moving without the other.
    const { MetaApiError } = await import("@/lib/meta/errors");
    const { toDashboardFailure } = await import("@/lib/meta/error-state");

    const kinds = [
      "auth",
      "permission",
      "rate_limit",
      "network",
      "server",
      "bad_request",
    ] as const;

    for (const kind of kinds) {
      const { messageKey } = toDashboardFailure(new MetaApiError("x", { kind }));
      for (const messages of [en, fr]) {
        const failure = (messages.Dashboard as Messages).failure as Messages;
        expect(failure[messageKey], `${kind} -> ${messageKey}`).toBeDefined();
      }
    }
  });
});
