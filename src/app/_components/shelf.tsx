import type { ReactNode } from "react";

export function Shelf({ children }: { children: ReactNode }) {
  return (
    <div
      role="list"
      className="relative flex flex-wrap items-end gap-x-1.5 gap-y-3.5 px-2 pb-3.5"
    >
      {children}
      {/* Decorative ledge, not a list item — excluded from the accessibility
          tree so assistive tech only counts actual books in the list. */}
      <div
        role="presentation"
        className="absolute inset-x-0 bottom-0 h-2 rounded-[2px] bg-gradient-to-b from-green-700 to-green-800 shadow-[0_5px_10px_-4px_rgba(16,36,26,0.35)]"
      />
    </div>
  );
}
