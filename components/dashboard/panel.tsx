/**
 * A titled dashboard panel.
 *
 * It is also a size container: what sits inside lays itself out by the
 * panel's own width, not the screen's. A chart in a third of a wide screen is
 * as narrow as one on a phone, and a layout keyed to the screen put a donut
 * and its legend side by side in 330 pixels — the legend then ran out of the
 * card.
 */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card-surface @container flex min-w-0 flex-col ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-black">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-foreground/50">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={`min-w-0 flex-1 px-5 pt-4 pb-5 sm:px-6 sm:pb-6 ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
