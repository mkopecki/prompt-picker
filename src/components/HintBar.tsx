interface HintBarProps {
  stagedCount: number;
  totalPromptCount: number;
  wordCount: number;
  searchText: string;
  version: string;
  showShortcuts: boolean;
}

function KeyBadge({ label }: { label: string }) {
  return (
    <span className="inline-block text-[11px] font-mono px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-600/50">
      {label}
    </span>
  );
}

export default function HintBar({
  stagedCount,
  totalPromptCount,
  wordCount,
  searchText,
  version,
  showShortcuts,
}: HintBarProps) {
  const isHome = searchText === "" && stagedCount === 0;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
      <div className="flex items-center gap-3">
        {showShortcuts ? (
          <span className="flex items-center gap-1">
            <KeyBadge label="?" />
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              back to prompts
            </span>
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <KeyBadge label="↑↓" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                navigate
              </span>
            </span>
            <span className="flex items-center gap-1">
              <KeyBadge label="tab" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                add
              </span>
            </span>
            {stagedCount > 0 && (
              <span className="flex items-center gap-1">
                <KeyBadge label="⇧↑↓" />
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  reorder
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <KeyBadge label="⏎" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                paste
              </span>
            </span>
            <span className="flex items-center gap-1">
              <KeyBadge label="⇧⏎" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                copy
              </span>
            </span>
          </>
        )}
      </div>
      <div className="text-[11px]">
        {showShortcuts || isHome ? (
          <span className="text-neutral-400 dark:text-neutral-500">
            {version}
          </span>
        ) : stagedCount > 0 ? (
          <span className="font-medium text-blue-500">~{wordCount} words</span>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-500">
            {totalPromptCount} prompts
          </span>
        )}
      </div>
    </div>
  );
}
