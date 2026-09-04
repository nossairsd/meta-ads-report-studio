import Image from "next/image";

type LogoSize = "md" | "lg";

const SIZES: Record<LogoSize, { px: number; mark: string; text: string }> = {
  md: { px: 40, mark: "h-10 w-10", text: "text-[17px]" },
  lg: { px: 52, mark: "h-13 w-13", text: "text-xl" },
};

export default function Logo({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="Meta Ads Report Studio"
        width={s.px}
        height={s.px}
        className={`${s.mark} shrink-0 object-contain`}
        priority
      />
      <span
        className={`${s.text} font-semibold tracking-tight whitespace-nowrap text-black`}
      >
        Meta Ads Report Studio
      </span>
    </div>
  );
}
