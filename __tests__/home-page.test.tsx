import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import Home from "@/app/[locale]/page";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

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
    expect(
      screen.getByRole("heading", { level: 1, name: "Meta Ads Report Studio" })
    ).toBeInTheDocument();
  });

  it("renders the English call to action", () => {
    renderWithLocale("en", en);
    expect(
      screen.getByRole("button", { name: "Try the demo" })
    ).toBeInTheDocument();
  });

  it("renders the French call to action", () => {
    renderWithLocale("fr", fr);
    expect(
      screen.getByRole("button", { name: "Essayer la démo" })
    ).toBeInTheDocument();
  });
});
