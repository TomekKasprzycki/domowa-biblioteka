"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/_components/sidebar.actions";
import { Pill } from "@/app/_components/pill";

const NAV_ROUTES = [
  { href: "/collection", icon: "📚", label: "Twoja kolekcja" },
  { href: "/friends", icon: "🤝", label: "Znajomi" },
  { href: "/discover", icon: "🔎", label: "Odkrywaj" },
  { href: "/requests", icon: "✉️", label: "Prośby" },
  { href: "/borrowing", icon: "🔁", label: "Wypożyczenia" },
  { href: "/account", icon: "⚙️", label: "Konto" },
] as const;

export function SidebarNav({
  pendingRequestCount,
  pendingReturnCount,
}: {
  pendingRequestCount: number;
  pendingReturnCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-1 min-[860px]:flex-col min-[860px]:gap-0.5">
      {NAV_ROUTES.map((route) => {
        const isActive = pathname === route.href;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={`flex items-center justify-between gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-green-700 text-white"
                : "text-[#CFE3D5] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{route.icon}</span>
              {route.label}
            </span>
            {route.href === "/requests" && pendingRequestCount > 0 && (
              <span
                aria-label={`Liczba próśb o wypożyczenie oczekujących na Twoją odpowiedź: ${pendingRequestCount}`}
              >
                <Pill tone="pending">{pendingRequestCount}</Pill>
              </span>
            )}
            {route.href === "/requests" && pendingReturnCount > 0 && (
              <span
                aria-label={`Liczba zwrotów oczekujących na Twoje potwierdzenie: ${pendingReturnCount}`}
              >
                <Pill tone="pending">{pendingReturnCount}</Pill>
              </span>
            )}
          </Link>
        );
      })}
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#CFE3D5] transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Wyloguj się
        </button>
      </form>
      <Link
        href="/privacy"
        className="whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#CFE3D5] transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        Prywatność
      </Link>
    </nav>
  );
}
