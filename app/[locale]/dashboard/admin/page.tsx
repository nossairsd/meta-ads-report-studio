import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Download, Inbox } from "lucide-react";

import { auth } from "@/lib/auth/config";
import { isAuthConfigured } from "@/lib/env";
import { isAdmin } from "@/lib/admin/access";
import { prisma } from "@/lib/db";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/admin/statuses";
import { RequestStatusSelect } from "@/components/admin/request-status-select";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return {
    title: `${t("title")} — Meta Ads Report Studio`,
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

const COLUMNS = "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_90px_minmax(0,1.6fr)_150px]";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isAuthConfigured()) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}?signin=required&next=/${locale}/dashboard/admin`);
  }
  // Not an admin: the page does not exist, as far as they can tell.
  if (!(await isAdmin(session.user.id))) notFound();

  const [t, requests] = await Promise.all([
    getTranslations("Admin"),
    prisma.earlyAccessRequest.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const statusLabels = Object.fromEntries(
    REQUEST_STATUSES.map((s) => [s, t(`status.${s}`)])
  ) as Record<RequestStatus, string>;
  const counts = Object.fromEntries(
    REQUEST_STATUSES.map((s) => [s, requests.filter((r) => r.status === s).length])
  ) as Record<RequestStatus, number>;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black md:text-3xl">{t("title")}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-foreground/55">{t("intro")}</p>
        </div>
        {requests.length > 0 && (
          // A plain anchor on purpose: the export is a file download, not a
          // page. next/link would prefetch it and try a client-side navigation.
          <a
            href={`/api/admin/early-access?locale=${locale}`}
            download
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-black/[0.1] bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-black/[0.03] sm:min-h-10"
          >
            <Download className="h-4 w-4" />
            {t("export")}
          </a>
        )}
      </header>

      <section className="grid grid-cols-3 gap-3">
        {REQUEST_STATUSES.map((s) => (
          <div key={s} className="card-surface p-4 sm:p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground/45 uppercase">
              {statusLabels[s]}
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-black tabular-nums">{counts[s]}</p>
          </div>
        ))}
      </section>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-black/[0.12] bg-white/60 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground/50">
            <Inbox className="h-6 w-6" />
          </span>
          <p className="mt-4 max-w-sm text-sm text-foreground/60">{t("empty")}</p>
        </div>
      ) : (
        <section className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-3.5">
            <p className="text-sm font-semibold text-black">{t("count", { count: requests.length })}</p>
          </div>
          <div
            className={`hidden gap-5 border-b border-black/[0.07] bg-black/[0.02] px-5 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-foreground/45 uppercase lg:grid ${COLUMNS}`}
          >
            <span>{t("columns.contact")}</span>
            <span>{t("columns.agency")}</span>
            <span>{t("columns.clients")}</span>
            <span>{t("columns.message")}</span>
            <span>{t("columns.status")}</span>
          </div>
          <ul className="divide-y divide-black/[0.06]">
            {requests.map((request) => (
              <li key={request.id} className={`grid gap-3 px-5 py-4 lg:items-center lg:gap-5 ${COLUMNS}`}>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-black">{request.name}</p>
                  <a
                    href={`mailto:${request.email}`}
                    className="block truncate text-sm text-primary hover:underline"
                  >
                    {request.email}
                  </a>
                  <p className="mt-0.5 text-xs text-foreground/45">{date.format(request.createdAt)}</p>
                </div>
                <div className="min-w-0 text-sm text-foreground/80">
                  <span className="truncate">{request.agency}</span>
                  <span className="ml-2 rounded bg-black/[0.05] px-1.5 py-px text-[10px] font-semibold text-foreground/55 uppercase">
                    {request.locale}
                  </span>
                </div>
                <p className="text-sm font-medium text-black tabular-nums">
                  <span className="text-foreground/50 lg:hidden">{t("columns.clients")} : </span>
                  {request.clientCount}
                </p>
                <p className="line-clamp-3 text-sm text-foreground/65" title={request.message ?? undefined}>
                  {request.message ?? "—"}
                </p>
                <RequestStatusSelect
                  id={request.id}
                  status={(REQUEST_STATUSES as readonly string[]).includes(request.status) ? (request.status as RequestStatus) : "new"}
                  labels={statusLabels}
                  ariaLabel={t("statusLabel", { name: request.name })}
                  failedLabel={t("saveFailed")}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
