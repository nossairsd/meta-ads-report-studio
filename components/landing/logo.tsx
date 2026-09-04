import Image from "next/image";

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/logo.png"
        alt="Meta Ads Report Studio"
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 object-contain"
        priority
      />
      <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap text-black">
        Meta Ads Report Studio
      </span>
    </div>
  );
}
