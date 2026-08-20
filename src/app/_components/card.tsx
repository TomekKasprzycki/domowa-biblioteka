import type { ReactNode } from "react";

export function Card({
  as = "div",
  children,
  className,
}: {
  as?: "li" | "div";
  children: ReactNode;
  className?: string;
}) {
  const classes = [
    "rounded-card border border-line bg-paper-card p-4 shadow-card",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (as === "li") {
    return <li className={classes}>{children}</li>;
  }

  return <div className={classes}>{children}</div>;
}
