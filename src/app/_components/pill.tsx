import type { ReactNode } from "react";
import type { PillTone } from "@/app/_components/design-system.types";

const TONE_CLASSES: Record<PillTone, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-blue-100 text-blue-700",
  mine: "border border-line bg-paper text-ink-soft",
};

export function Pill({
  tone,
  children,
}: {
  tone: PillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
