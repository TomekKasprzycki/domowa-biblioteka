import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import type {
  ButtonSize,
  ButtonVariant,
} from "@/app/_components/design-system.types";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-green-700 text-white hover:bg-green-600",
  ghost: "border-green-300 bg-transparent text-green-700 hover:bg-green-100",
  "outline-blue":
    "border-blue-300 bg-transparent text-blue-700 hover:bg-blue-100",
  decline: "border-amber-200 bg-transparent text-amber-700",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "gap-2 px-4 py-2.5 text-sm",
  sm: "gap-1.5 px-3 py-1.5 text-xs",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center rounded-lg border font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

type SharedProps = {
  variant: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedProps> & {
    href?: undefined;
  };

type ButtonAsLink = SharedProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof SharedProps | "href"
  > & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant, size = "default", children, className, href, ...rest } =
    props;
  const classes = [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={classes}
        {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
