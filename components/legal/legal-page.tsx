import type { ReactNode } from "react";

/** Shared shell for the legal pages: sober, readable, no marketing. */
export function LegalPage({
  title,
  updatedLabel,
  children,
}: {
  title: string;
  updatedLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-32 pb-24">
      <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-foreground/50">{updatedLabel}</p>
      <div className="mt-10 space-y-8">{children}</div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium text-black">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/70">{children}</div>
    </section>
  );
}
