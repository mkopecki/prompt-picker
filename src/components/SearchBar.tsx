import { forwardRef } from "react";

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
}

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange }, ref) => {
    const hasText = value.length > 0;

    return (
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 bg-neutral-100 dark:bg-neutral-700 border ${
          hasText
            ? "border-blue-400/50"
            : "border-transparent"
        }`}
      >
        {/* Magnifying glass icon */}
        <svg
          className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search prompts..."
          className="flex-1 bg-transparent outline-none text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
        />

        <span className="shrink-0 text-[11px] font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 border border-neutral-300/50 dark:border-neutral-500/50">
          esc
        </span>
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";

export default SearchBar;
