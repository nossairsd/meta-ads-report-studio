import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import Logo from "@/components/landing/logo";

// lucide-react dropped brand/logo icons in this version — inline the two we need.
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

export default function Footer() {
  const t = useTranslations("Landing.footer");

  return (
    <footer className="border-border flex w-full flex-col items-center justify-center gap-7 border-t py-10 text-sm md:gap-8 md:py-16">
      <Logo size="lg" />

      <p className="max-w-sm text-center text-foreground/70">{t("cta")}</p>

      <div className="flex items-center justify-center gap-6 text-black/70">
        <a href="#" aria-label="LinkedIn" className="transition-opacity hover:opacity-70">
          <LinkedinIcon />
        </a>
        <a href="#" aria-label="Email" className="transition-opacity hover:opacity-70">
          <Mail className="h-5 w-5" />
        </a>
        <a href="#" aria-label="GitHub" className="transition-opacity hover:opacity-70">
          <GithubIcon />
        </a>
      </div>

      <p className="text-center text-foreground/50">{t("credit")}</p>
    </footer>
  );
}
