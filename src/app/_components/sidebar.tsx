import { auth } from "@/auth";
import {
  countIncomingRequests,
  countPendingReturns,
} from "@/server/loan/loan.repository";
import { countBooksForUser } from "@/server/book/book.repository";
import { Avatar } from "@/app/_components/avatar";
import { SidebarNav } from "@/app/_components/sidebar-nav";
import { pluralizePl } from "@/lib/pluralize-pl.utils";

// Sidebar renders from the (app) route group's layout, so an unhandled
// rejection here would 500 every authenticated page. The counts are
// decorative, so a failed count degrades to "no badge"/0 rather than an error.
async function safeCount(
  label: string,
  load: () => Promise<number>
): Promise<number> {
  try {
    return await load();
  } catch (error) {
    console.error(`Failed to load ${label} for sidebar`, error);
    return 0;
  }
}

export default async function Sidebar() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [pendingRequestCount, pendingReturnCount, bookCount] =
    await Promise.all([
      safeCount("pending request count", () => countIncomingRequests(userId)),
      safeCount("pending return count", () => countPendingReturns(userId)),
      safeCount("book count", () => countBooksForUser(userId)),
    ]);

  const displayName = session.user?.name ?? session.user?.email ?? "";

  return (
    <aside className="sticky top-0 z-10 flex flex-row items-center gap-5 overflow-x-auto bg-green-950 px-4 py-3.5 text-[#EAF3EC] min-[860px]:h-screen min-[860px]:flex-col min-[860px]:items-stretch min-[860px]:gap-[34px] min-[860px]:overflow-visible min-[860px]:px-[18px] min-[860px]:py-7">
      <div className="flex flex-shrink-0 items-center gap-2.5 px-1.5">
        <div
          aria-hidden="true"
          className="relative h-[38px] w-[30px] flex-shrink-0 rounded-[2px_6px_6px_2px] bg-gradient-to-b from-green-500 to-green-700 shadow-[inset_-3px_0_0_rgba(0,0,0,0.18)]"
        />
        <div className="font-display text-[17px] font-semibold leading-[1.15] tracking-wide">
          Domowa
          <br />
          Biblioteka
        </div>
      </div>

      <SidebarNav
        pendingRequestCount={pendingRequestCount}
        pendingReturnCount={pendingReturnCount}
      />

      <div className="hidden items-center gap-2.5 border-t border-white/10 px-2 pt-2.5 min-[860px]:mt-auto min-[860px]:flex">
        <Avatar name={displayName} />
        <div>
          <div className="text-[13px] font-semibold">{displayName}</div>
          <div className="text-[11px] text-green-300">
            {bookCount} {pluralizePl(bookCount, ["książka", "książki", "książek"])} na półce
          </div>
        </div>
      </div>
    </aside>
  );
}
