import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import Home from "@/app/[locale]/page";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useRouter: () => ({ push: vi.fn() }),
}));

function renderWithLocale(locale: string, messages: Record<string, unknown>) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Home />
    </NextIntlClientProvider>
  );
}

describe("Home page", () => {
  it("renders the main heading", () => {
    renderWithLocale("en", en);
    // TextBlurEffect splits the headline into one <span> per character (for the
    // reveal animation), which makes the computed accessible name add a space
    // between every letter. textContent concatenates the raw text instead, so
    // it still reconstructs the original string exactly.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Meta Ads reports in one click");
  });

  it("renders the English call to action", () => {
    renderWithLocale("en", en);
    // "Try the demo" appears both in the sticky nav and the hero — that's expected.
    expect(screen.getAllByRole("button", { name: "Try the demo" }).length).toBeGreaterThan(0);
  });

  it("renders the French call to action", () => {
    renderWithLocale("fr", fr);
    expect(
      screen.getAllByRole("button", { name: "Essayer la démo" }).length
    ).toBeGreaterThan(0);
  });
});
