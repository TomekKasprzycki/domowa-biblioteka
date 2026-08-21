import type { ReactNode } from "react";

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-paper-card px-5 py-10 text-center text-[13.5px] text-ink-faint">
      {children}
    </div>
  );
}
