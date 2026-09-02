import type { ReactNode } from "react";

export function Section({
  title,
  children,
  collapsible = true,
  defaultOpen = true,
  headingLevel = 2,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";

  if (!collapsible) {
    return (
      <section className="flex flex-col gap-3">
        <Heading className="text-sm font-semibold text-green-800">{title}</Heading>
        {children}
      </section>
    );
  }

  return (
    <details open={defaultOpen} className="group flex flex-col gap-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <Heading className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800">
          <span
            aria-hidden="true"
            className="inline-block text-base transition-transform group-open:rotate-90"
          >
            ▸
          </span>
          {title}
        </Heading>
      </summary>
      {children}
    </details>
  );
}
