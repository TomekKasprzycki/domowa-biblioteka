import type { ReactNode } from "react";

export function Section({
  title,
  children,
  collapsible = true,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  if (!collapsible) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-green-800">{title}</h2>
        {children}
      </section>
    );
  }

  return (
    <details open={defaultOpen} className="group flex flex-col gap-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800">
          <span
            aria-hidden="true"
            className="inline-block text-base transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          {title}
        </h2>
      </summary>
      {children}
    </details>
  );
}
