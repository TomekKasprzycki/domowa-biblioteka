import type { ReactNode } from "react";
import type { LibraryCardTone } from "@/app/_components/design-system.types";

const STAMP_STYLES: Record<
  LibraryCardTone,
  { background: string; borderColor: string; textColor: string }
> = {
  default: {
    background:
      "repeating-linear-gradient(180deg, var(--color-green-100), var(--color-green-100) 7px, #fff 7px, #fff 14px)",
    borderColor: "var(--color-green-300)",
    textColor: "var(--color-green-600)",
  },
  "pending-return": {
    background:
      "repeating-linear-gradient(180deg, var(--color-blue-100), var(--color-blue-100) 7px, #fff 7px, #fff 14px)",
    borderColor: "var(--color-blue-300)",
    textColor: "var(--color-blue-700)",
  },
};

export function LibraryCard({
  stampLabel,
  tone,
  title,
  subtitle,
  metaLabel,
  pill,
  actions,
}: {
  stampLabel: string;
  tone: LibraryCardTone;
  title: string;
  subtitle: ReactNode;
  metaLabel?: string;
  pill?: ReactNode;
  actions?: ReactNode;
}) {
  const stamp = STAMP_STYLES[tone];

  return (
    <div className="flex overflow-hidden rounded-card border border-line bg-paper-card shadow-card">
      <div
        className="flex w-16 flex-shrink-0 items-center justify-center border-r border-dashed"
        style={{ background: stamp.background, borderColor: stamp.borderColor }}
      >
        <span
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: stamp.textColor,
          }}
        >
          {stampLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:px-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div>
            <div className="font-display text-[16.5px] font-semibold text-ink">
              {title}
            </div>
            <div className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</div>
          </div>
          {pill}
        </div>
        {metaLabel && (
          <div className="flex flex-wrap gap-4 font-mono text-[11px] text-ink-faint">
            <span>{metaLabel}</span>
          </div>
        )}
        {actions && <div className="mt-0.5 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
