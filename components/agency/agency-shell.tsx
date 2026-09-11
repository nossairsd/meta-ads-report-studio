"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LayoutGrid, Menu, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Logo from "@/components/landing/logo";
import LocaleToggle from "@/components/landing/locale-toggle";
import { Monogram } from "@/components/agency/monogram";

type ShellProps = {
  /** "/dashboard" for the live app, "/demo" for the sample agency. */
  basePath: "/dashboard" | "/demo";
  clients: { id: string; name: string }[];
  agencyName: string | null;
  isDemo?: boolean;
  /** Rendered at the bottom of the sidebar: sign-out, or the demo's call to action. */
  footer?: React.ReactNode;
  /** Rendered above the page content — the demo's explanation banner. */
  banner?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The agency's frame: a sidebar listing every client on large screens, a top
 * bar with a drawer on small ones.
 *
 * The client list is always one tap away because moving between clients is
 * what an account manager does all day; making them return to the overview
 * each time would double every navigation.
 */
export function AgencyShell({
  basePath,
  clients,
  agencyName,
  isDemo = false,
  footer,
  banner,
  children,
}: ShellProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Agency.nav");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <SidebarContent
      basePath={basePath}
      clients={clients}
      agencyName={agencyName}
      isDemo={isDemo}
      footer={footer}
      onNavigate={() => setOpen(false)}
    />
  );

  return (
    <div className="min-h-dvh w-full bg-[#F6F7F9]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-black/[0.07] bg-white lg:flex">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/[0.07] bg-white/90 px-3 backdrop-blur-lg lg:hidden">
        <Link href="/" className="flex min-h-11 items-center px-1" aria-label="Meta Ads Report Studio">
          <Logo className="[&_span]:text-[15px] [&_img]:h-8 [&_img]:w-8" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={open}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-black hover:bg-black/[0.05]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <motion.div
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] bg-white shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="absolute top-2 right-2 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-black/[0.05]"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {banner}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  basePath,
  clients,
  agencyName,
  isDemo,
  footer,
  onNavigate,
}: Omit<ShellProps, "children" | "banner"> & { onNavigate: () => void }) {
  const t = useTranslations("Agency.nav");
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    `flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition-colors lg:min-h-10 ${
      active
        ? "bg-primary/10 font-semibold text-primary"
        : "text-foreground/70 hover:bg-black/[0.04] hover:text-black"
    }`;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link href="/" onClick={onNavigate} className="inline-flex">
          <Logo className="[&_span]:text-[15px] [&_img]:h-8 [&_img]:w-8" />
        </Link>
        <p className="mt-4 text-[11px] font-semibold tracking-[0.12em] text-foreground/40 uppercase">
          {t("agency")}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-black">
          {agencyName ?? "—"}
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 px-3" data-lenis-prevent>
        <Link
          href={basePath}
          onClick={onNavigate}
          className={itemClass(pathname === basePath)}
          aria-current={pathname === basePath ? "page" : undefined}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          {t("overview")}
        </Link>

        <p className="mt-4 mb-1 px-3 text-[11px] font-semibold tracking-[0.12em] text-foreground/40 uppercase">
          {t("clients")}
        </p>
        <ul className="-mr-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto pr-1">
          {clients.length === 0 && (
            <li className="px-3 py-2 text-sm text-foreground/45">{t("noClients")}</li>
          )}
          {clients.map((client) => {
            const href = `${basePath}/clients/${client.id}`;
            const active = pathname === href;
            return (
              <li key={client.id}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={itemClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Monogram name={client.name} size="sm" />
                  <span className="truncate">{client.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {!isDemo && (
          <Link
            href={`${basePath}/setup`}
            onClick={onNavigate}
            className={`mt-2 ${itemClass(pathname === `${basePath}/setup`)}`}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            {t("organize")}
          </Link>
        )}
      </nav>

      <div className="flex flex-col gap-3 border-t border-black/[0.07] p-4">
        <LocaleToggle layoutId="locale-pill-shell" className="self-start" />
        {footer}
      </div>
    </div>
  );
}
