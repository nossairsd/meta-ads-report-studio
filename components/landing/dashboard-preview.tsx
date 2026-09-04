const kpis = [
  { label: "Spend", value: "€4,281" },
  { label: "Impressions", value: "812K" },
  { label: "Clicks", value: "14.2K" },
  { label: "Conversions", value: "926" },
];

const sparklinePoints =
  "0,58 24,48 48,52 72,32 96,38 120,18 144,24 168,6 192,14 216,2 240,10";

export function DashboardPreview() {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl shadow-black/10">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-black/5 bg-secondary/60 px-5 py-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
        <span className="ml-3 text-xs font-medium text-foreground/60">
          Dupont &amp; Co — app.metaadsreportstudio.com
        </span>
      </div>

      <div className="p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              Dupont &amp; Co
            </p>
            <p className="text-lg font-semibold text-black">Last 30 days</p>
          </div>
          <div className="flex gap-1.5 rounded-full bg-secondary p-1 text-xs font-medium text-foreground/60">
            <span className="rounded-full px-3 py-1.5 text-foreground/40">7d</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-black shadow-sm">30d</span>
            <span className="rounded-full px-3 py-1.5 text-foreground/40">90d</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl bg-secondary px-4 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/50">
                {kpi.label}
              </p>
              <p className="mt-1 text-xl font-semibold text-black">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-secondary p-5 md:col-span-3">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-wide text-foreground/50">
              Daily spend
            </p>
            <svg viewBox="0 0 240 64" className="h-20 w-full" fill="none">
              <polyline
                points={sparklinePoints}
                stroke="#2563EB"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-secondary p-5 md:col-span-2">
            <p className="self-start text-[11px] font-medium uppercase tracking-wide text-foreground/50">
              By campaign
            </p>
            <div
              className="h-20 w-20 rounded-full"
              style={{
                background:
                  "conic-gradient(#2563EB 0% 45%, #16A34A 45% 72%, #F59E0B 72% 90%, #8B5CF6 90% 100%)",
              }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <div className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white">
            <span>📄</span>
            Download PDF Report
          </div>
        </div>
      </div>
    </div>
  );
}
