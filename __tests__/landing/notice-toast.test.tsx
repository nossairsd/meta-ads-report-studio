import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

// The enter and exit animations are not what is under test, and jsdom does
// not run them: render the notice as plain elements so only its timing logic
// is exercised.
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: Record<string, unknown>) => <div {...(props as React.HTMLAttributes<HTMLDivElement>)} />,
  },
}));

import { NoticeToast } from "@/components/landing/notice-toast";

const props = { title: "Sign in", body: "That page needs a Meta connection.", dismissLabel: "Dismiss" };

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/fr?signin=required&error=AccessDenied&next=/fr/dashboard");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NoticeToast", () => {
  it("closes on its own once read", () => {
    render(<NoticeToast tone="info" {...props} />);
    expect(screen.getByRole("status")).toBeTruthy();

    act(() => vi.advanceTimersByTime(5_999));
    expect(screen.queryByRole("status")).toBeTruthy();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("leaves an error up longer, since it may need acting on", () => {
    render(<NoticeToast tone="error" {...props} />);

    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.queryByRole("alert")).toBeTruthy();

    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("waits while hovered, and resumes with the time that was left", () => {
    render(<NoticeToast tone="info" {...props} />);
    const notice = screen.getByRole("status");

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.mouseEnter(notice);
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.queryByRole("status")).toBeTruthy();

    fireEvent.mouseLeave(notice);
    act(() => vi.advanceTimersByTime(3_999));
    expect(screen.queryByRole("status")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("closes at once from its button", () => {
    render(<NoticeToast tone="info" {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("removes the parameters that raised it, so a refresh does not raise it again", () => {
    render(<NoticeToast tone="info" {...props} />);
    const params = new URLSearchParams(window.location.search);
    expect(params.has("signin")).toBe(false);
    expect(params.has("error")).toBe(false);
    // Anything else in the URL is left alone.
    expect(params.get("next")).toBe("/fr/dashboard");
  });
});
