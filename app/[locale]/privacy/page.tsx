import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: `${t("title")} — Meta Ads Report Studio` };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  const sections = [
    "controller",
    "whatWeCollect",
    "why",
    "retention",
    "sharing",
    "rights",
    "contact",
  ] as const;

  return (
    <LegalPage title={t("title")} updatedLabel={t("updated")}>
      {sections.map((section) => (
        <LegalSection key={section} heading={t(`${section}.heading`)}>
          <p>{t(`${section}.body`)}</p>
        </LegalSection>
      ))}
    </LegalPage>
  );
}
