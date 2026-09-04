import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import LenisProvider from "@/providers/lenis";
import "../globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meta Ads Report Studio",
  description: "Generate professional Meta Ads performance reports in one click.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      {/* overflow-x is clipped on <html> only: setting it here too would make
          CSS compute overflow-y:auto on the body, giving it a second scrollbar
          and shrinking full-bleed sections by the scrollbar width. */}
      <body className="flex min-h-full w-full flex-col">
        <NextIntlClientProvider>
          <LenisProvider>{children}</LenisProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
