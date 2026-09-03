import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <Button>{t("cta")}</Button>
    </div>
  );
}