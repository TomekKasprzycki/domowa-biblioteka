import type { DiscoverBook } from "@/app/discover/discover.types";

export function DiscoverBookRow({ book }: { book: DiscoverBook }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{book.title}</p>
          <p className="text-sm text-zinc-600">{book.author}</p>
          {book.notes && (
            <p className="mt-1 text-sm text-zinc-500">{book.notes}</p>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            Owned by {book.owner.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Available
        </span>
      </div>
    </li>
  );
}
