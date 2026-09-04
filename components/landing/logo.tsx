export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="#2563EB" />
      <rect x="8" y="17" width="4" height="8" rx="1.5" fill="white" fillOpacity="0.55" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="white" fillOpacity="0.8" />
      <rect x="20" y="7" width="4" height="18" rx="1.5" fill="#16A34A" />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-7 w-7 shrink-0" />
      <span className="text-[15px] font-semibold tracking-tight text-black whitespace-nowrap">
        Meta Ads Report Studio
      </span>
    </div>
  );
}
