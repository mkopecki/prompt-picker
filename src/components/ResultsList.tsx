import { useEffect, useRef } from "react";
import type { Prompt, UsageData } from "../lib/types";
import type { Section } from "../hooks/useSearch";

interface ResultsListProps {
  sections: Section[];
  flatResults: Prompt[];
  searchText: string;
  highlightIndex: number;
  stagedPaths: Set<string>;
  usageData: UsageData;
  onSelect: (prompt: Prompt) => void;
  onHighlight: (index: number) => void;
}

function IndicatorDot({
  isFirstClass,
  isStaged,
}: {
  isFirstClass: boolean;
  isStaged: boolean;
}) {
  if (isStaged) {
    return (
      <svg
        className="w-3.5 h-3.5 text-blue-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <div
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        isFirstClass ? "bg-blue-500" : "bg-neutral-300 dark:bg-neutral-600 opacity-40"
      }`}
    />
  );
}

function RightBadge({
  prompt,
  sectionTitle,
  usageData,
  isStaged,
}: {
  prompt: Prompt;
  sectionTitle: string | null;
  usageData: UsageData;
  isStaged: boolean;
}) {
  if (isStaged) {
    return (
      <svg
        className="w-3 h-3 text-blue-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (sectionTitle === "PINNED" && prompt.hasExtends) {
    return (
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
        +{prompt.extendsCount} deps
      </span>
    );
  }

  if (sectionTitle === "FREQUENT") {
    const count = usageData[prompt.path]?.count ?? 0;
    return (
      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
        {count}x
      </span>
    );
  }

  return null;
}

function ResultRow({
  prompt,
  index,
  isHighlighted,
  isStaged,
  sectionTitle,
  usageData,
  onSelect,
  onHighlight,
}: {
  prompt: Prompt;
  index: number;
  isHighlighted: boolean;
  isStaged: boolean;
  sectionTitle: string | null;
  usageData: UsageData;
  onSelect: (prompt: Prompt) => void;
  onHighlight: (index: number) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isFirstClass = prompt.type === "prompt";

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-2 px-2 py-[7px] rounded-md cursor-pointer ${
        isHighlighted
          ? "bg-blue-50 dark:bg-blue-900/30"
          : isStaged
            ? "bg-blue-50/50 dark:bg-blue-900/20"
            : ""
      }`}
      onClick={() => onHighlight(index)}
      onDoubleClick={() => onSelect(prompt)}
    >
      <IndicatorDot isFirstClass={isFirstClass} isStaged={isStaged} />
      <span
        className={`flex-1 text-[13px] truncate ${
          isFirstClass
            ? "text-neutral-900 dark:text-neutral-100"
            : "text-neutral-400 dark:text-neutral-500"
        } ${isHighlighted ? "font-medium" : "font-normal"}`}
      >
        {isFirstClass ? prompt.name : prompt.path}
      </span>
      <RightBadge
        prompt={prompt}
        sectionTitle={sectionTitle}
        usageData={usageData}
        isStaged={isStaged}
      />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-1 pt-1 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
      {title}
    </div>
  );
}

export default function ResultsList({
  sections,
  flatResults,
  searchText,
  highlightIndex,
  stagedPaths,
  usageData,
  onSelect,
  onHighlight,
}: ResultsListProps) {
  if (flatResults.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
        {searchText
          ? `No matches for '${searchText}'`
          : "No prompts found"}
      </div>
    );
  }

  // When searching: flat list, no section headers
  if (searchText.trim()) {
    return (
      <div className="space-y-px">
        {flatResults.map((prompt, i) => (
          <ResultRow
            key={`${prompt.repo}:${prompt.path}`}
            prompt={prompt}
            index={i}
            isHighlighted={i === highlightIndex}
            isStaged={stagedPaths.has(prompt.path)}
            sectionTitle={null}
            usageData={usageData}
            onSelect={onSelect}
            onHighlight={onHighlight}
          />
        ))}
      </div>
    );
  }

  // Home state: sections
  let globalIndex = 0;
  return (
    <div>
      {sections.map((section) => (
        <div key={section.title}>
          <SectionHeader title={section.title} />
          <div className="space-y-px">
            {section.items.map((prompt) => {
              const idx = globalIndex++;
              return (
                <ResultRow
                  key={`${prompt.repo}:${prompt.path}`}
                  prompt={prompt}
                  index={idx}
                  isHighlighted={idx === highlightIndex}
                  isStaged={stagedPaths.has(prompt.path)}
                  sectionTitle={section.title}
                  usageData={usageData}
                  onSelect={onSelect}
                  onHighlight={onHighlight}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
