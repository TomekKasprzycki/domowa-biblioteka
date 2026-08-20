import { spineStyleFor } from "@/lib/spine-style.utils";

export function Spine({
  title,
  author,
  tag,
  onClick,
}: {
  title: string;
  author: string;
  tag?: string;
  onClick: () => void;
}) {
  const { color, height, width, onPaper } = spineStyleFor(title);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${title}, ${author}`}
      style={{ height, width, background: color }}
      className="relative flex flex-shrink-0 items-end justify-center rounded-t-[3px] border-0 pb-2.5 shadow-[inset_-6px_0_10px_-6px_rgba(0,0,0,0.35),inset_2px_0_0_rgba(255,255,255,0.12)] transition-transform duration-150 ease-out hover:-translate-y-1.5 before:absolute before:inset-x-0 before:top-3 before:h-0.5 before:bg-white/25 before:content-[''] after:absolute after:inset-x-0 after:bottom-6 after:h-0.5 after:bg-white/25 after:content-['']"
    >
      {tag && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-3 whitespace-nowrap rounded-[3px] bg-blue-500 px-[7px] py-0.5 font-mono text-[10.5px] tracking-wide text-white shadow-[0_2px_6px_rgba(40,91,126,0.35)]">
          {tag}
        </span>
      )}
      <span
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        className={`max-h-[82%] overflow-hidden text-ellipsis whitespace-nowrap font-display text-[12.5px] font-semibold tracking-wide ${
          onPaper
            ? "text-green-800"
            : "text-white/95 [text-shadow:0_1px_1px_rgba(0,0,0,0.15)]"
        }`}
      >
        {title}
      </span>
    </button>
  );
}
