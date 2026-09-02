import type { ButtonHTMLAttributes, ReactNode } from "react";
import type {
  ButtonSize,
  ButtonVariant,
} from "@/app/_components/design-system.types";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "text-green-700 hover:bg-green-100",
  ghost: "text-green-700 hover:bg-green-100",
  "outline-blue": "text-blue-700 hover:bg-blue-100",
  decline: "text-amber-700 hover:bg-amber-200/50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "p-2.5 text-base",
  sm: "p-1.5 text-sm",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-md transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

export type IconButtonProps = {
  icon: ReactNode;
  label: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title">;

export function IconButton({
  icon,
  label,
  variant,
  size = "default",
  className,
  ...rest
}: IconButtonProps) {
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button aria-label={label} title={label} className={classes} {...rest}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
