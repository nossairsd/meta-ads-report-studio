import { describe, it, expect } from "vitest";
import { MetaApiError, NotConnectedError } from "@/lib/meta/errors";
import { toDashboardFailure } from "@/lib/meta/error-state";

describe("toDashboardFailure", () => {
  it("asks the user to reconnect when the token is no longer valid", () => {
    const failure = toDashboardFailure(new MetaApiError("expired", { kind: "auth" }));
    expect(failure.messageKey).toBe("expired");
    expect(failure.needsReconnect).toBe(true);
  });

  it("asks the user to reconnect when the permission is missing", () => {
    // Retrying cannot grant a scope; only a new consent screen can.
    expect(toDashboardFailure(new MetaApiError("no scope", { kind: "permission" })))
      .toMatchObject({ needsReconnect: true });
  });

  it("offers a plain retry when Meta is merely throttling", () => {
    // Reconnecting would not help and would cost the user their consent flow.
    expect(toDashboardFailure(new MetaApiError("slow down", { kind: "rate_limit" })))
      .toMatchObject({ messageKey: "rateLimit", needsReconnect: false });
  });

  it("offers a plain retry on a network or server failure", () => {
    for (const kind of ["network", "server"] as const) {
      expect(toDashboardFailure(new MetaApiError("x", { kind }))).toMatchObject({
        needsReconnect: false,
      });
    }
  });

  it("recognises a user who has no ad account to report on", () => {
    expect(toDashboardFailure(new NotConnectedError())).toMatchObject({
      messageKey: "notConnected",
      needsReconnect: true,
    });
  });

  it("surfaces Meta's trace id, which is what their support asks for", () => {
    const error = new MetaApiError("boom", { kind: "server", traceId: "AbC123" });
    expect(toDashboardFailure(error).detail).toContain("AbC123");
  });

  it("never leaks the message of an error it does not recognise", () => {
    // An internal error can carry a path, a query, or a connection string.
    const failure = toDashboardFailure(
      new Error("connect ECONNREFUSED 10.0.0.4:5432 postgres://user:pw@host/db")
    );

    expect(failure.messageKey).toBe("unexpected");
    expect(failure.detail).toBeNull();
    expect(JSON.stringify(failure)).not.toContain("postgres://");
  });

  it("copes with a thrown value that is not an Error at all", () => {
    expect(toDashboardFailure("just a string")).toMatchObject({ messageKey: "unexpected" });
    expect(toDashboardFailure(undefined)).toMatchObject({ messageKey: "unexpected" });
  });

  it("maps every kind the Meta client can raise, with no gaps", () => {
    const kinds = ["auth", "rate_limit", "permission", "bad_request", "server", "network"] as const;
    for (const kind of kinds) {
      expect(toDashboardFailure(new MetaApiError("x", { kind })).messageKey).toBeTruthy();
    }
  });
});
