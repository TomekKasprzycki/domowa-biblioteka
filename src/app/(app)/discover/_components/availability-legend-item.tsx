import type { ReactNode } from "react";

const DOT_CLASSES = {
  available: "bg-green-500",
  unavailable: "bg-blue-500",
} as const;

export function AvailabilityLegendItem({
  tone,
  children,
}: {
  tone: keyof typeof DOT_CLASSES;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-[7px]">
      <span className={`h-[9px] w-[9px] rounded-full ${DOT_CLASSES[tone]}`} />
      {children}
    </div>
  );
}
