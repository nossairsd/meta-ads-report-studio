import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DataDeletion");
  return { title: `${t("title")} — Meta Ads Report Studio` };
}

export default async function DataDeletionPage() {
  const t = await getTranslations("DataDeletion");

  return (
    <LegalPage title={t("title")} updatedLabel={t("updated")}>
      <LegalSection heading={t("what.heading")}>
        <p>{t("what.body")}</p>
      </LegalSection>

      <LegalSection heading={t("selfServe.heading")}>
        <p>{t("selfServe.body")}</p>
      </LegalSection>

      <LegalSection heading={t("request.heading")}>
        <p>{t("request.body")}</p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>{t("request.step1")}</li>
          <li>{t("request.step2")}</li>
          <li>{t("request.step3")}</li>
        </ol>
      </LegalSection>

      <LegalSection heading={t("demo.heading")}>
        <p>{t("demo.body")}</p>
      </LegalSection>
    </LegalPage>
  );
}
