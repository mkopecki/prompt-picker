import type { StagedItem } from "../lib/staging";
import type { ChainError } from "../lib/types";

interface StagingAreaProps {
  items: StagedItem[];
  highlightIndex: number;
  isActive: boolean;
  errors: ChainError[];
  onRemove: (path: string) => void;
}

function StagedRow({
  item,
  index,
  isHighlighted,
  isActive,
}: {
  item: StagedItem;
  index: number;
  isHighlighted: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border-l-2 ${
        item.auto
          ? "border-l-neutral-300 dark:border-l-neutral-600"
          : "border-l-blue-500"
      } ${
        isHighlighted && isActive
          ? "bg-blue-50 dark:bg-blue-900/30"
          : "bg-neutral-50 dark:bg-neutral-700/50"
      }`}
    >
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500 w-4 shrink-0 text-right">
        {index + 1}
      </span>
      <span
        className={`flex-1 text-[12px] truncate ${
          item.auto
            ? "text-neutral-400 dark:text-neutral-500"
            : "text-neutral-900 dark:text-neutral-100 font-medium"
        }`}
      >
        {item.name}
      </span>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded ${
          item.auto
            ? "text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-600/50"
            : "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
        }`}
      >
        {item.auto ? "auto" : "selected"}
      </span>
    </div>
  );
}

export default function StagingArea({
  items,
  highlightIndex,
  isActive,
  errors,
  onRemove: _onRemove,
}: StagingAreaProps) {
  if (items.length === 0) return null;

  return (
    <div className="px-3">
      {/* Divider */}
      <div className="border-t border-neutral-200/50 dark:border-neutral-700/50 my-1" />

      {/* Header */}
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Clipboard Staging
        </span>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {items.length} component{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Staged items */}
      <div className="space-y-1">
        {items.map((item, i) => (
          <StagedRow
            key={`${item.repo}:${item.path}`}
            item={item}
            index={i}
            isHighlighted={i === highlightIndex}
            isActive={isActive}
          />
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-1 space-y-1">
          {errors.map((error, i) => (
            <div
              key={i}
              className="text-[11px] text-red-500 dark:text-red-400 px-1 py-0.5"
            >
              {error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
