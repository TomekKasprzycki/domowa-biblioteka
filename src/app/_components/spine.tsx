import {
  spineStyleFor,
  splitTitleForTwoColumns,
  SPINE_TITLE_TOP_CLEARANCE,
  SPINE_TITLE_BOTTOM_CLEARANCE,
} from "@/lib/spine-style.utils";

function TitleColumn({
  text,
  maxHeight,
  onPaper,
  ellipsis,
}: {
  text: string;
  maxHeight: number;
  onPaper: boolean;
  ellipsis: boolean;
}) {
  return (
    <span
      style={{
        writingMode: "vertical-rl",
        transform: "rotate(180deg)",
        maxHeight,
      }}
      className={`overflow-hidden whitespace-nowrap font-display text-[12.5px] font-semibold tracking-wide ${
        ellipsis ? "text-ellipsis" : ""
      } ${
        onPaper
          ? "text-green-800"
          : "text-white/95 [text-shadow:0_1px_1px_rgba(0,0,0,0.15)]"
      }`}
    >
      {text}
    </span>
  );
}

export function Spine({
  title,
  author,
  isbn,
  tag,
  onClick,
}: {
  title: string;
  author: string;
  isbn?: string | null;
  tag?: string;
  onClick: () => void;
}) {
  const { color, height, width, onPaper, columns } = spineStyleFor(title);
  const titleMaxHeight = Math.max(
    0,
    height - SPINE_TITLE_TOP_CLEARANCE - SPINE_TITLE_BOTTOM_CLEARANCE
  );
  const tooltip = `${title} — ${author}${isbn ? ` · ISBN ${isbn}` : ""}`;
  const titleParts =
    columns === 2
      ? splitTitleForTwoColumns(title, titleMaxHeight)
      : [title];

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={`View ${title}, ${author}`}
      style={{
        height,
        width,
        background: color,
        paddingBottom: SPINE_TITLE_BOTTOM_CLEARANCE,
      }}
      className="relative flex flex-shrink-0 items-end justify-center rounded-t-[3px] border-0 shadow-[inset_-6px_0_10px_-6px_rgba(0,0,0,0.35),inset_2px_0_0_rgba(255,255,255,0.12)] transition-transform duration-150 ease-out hover:-translate-y-1.5 before:absolute before:inset-x-0 before:top-3 before:h-0.5 before:bg-white/25 before:content-[''] after:absolute after:inset-x-0 after:bottom-6 after:h-0.5 after:bg-white/25 after:content-['']"
    >
      {tag && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-3 whitespace-nowrap rounded-[3px] bg-blue-500 px-[7px] py-0.5 font-mono text-[10.5px] tracking-wide text-white shadow-[0_2px_6px_rgba(40,91,126,0.35)]">
          {tag}
        </span>
      )}
      <span className="flex items-end gap-0.5">
        {titleParts.map((part, index) => (
          <TitleColumn
            key={index}
            text={part}
            maxHeight={titleMaxHeight}
            onPaper={onPaper}
            ellipsis={index === titleParts.length - 1}
          />
        ))}
      </span>
    </button>
  );
}
