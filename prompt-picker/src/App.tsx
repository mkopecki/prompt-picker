import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { getPrompts } from "./lib/commands";
import type { Prompt, UsageData } from "./lib/types";
import { useSearch } from "./hooks/useSearch";
import { useKeyboard } from "./hooks/useKeyboard";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import HintBar from "./components/HintBar";
import "./index.css";

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchText, setSearchText] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [usageData] = useState<UsageData>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { sections, flatResults } = useSearch(prompts, searchText, usageData);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchText]);

  // Load prompts on mount
  useEffect(() => {
    getPrompts().then(setPrompts);
  }, []);

  // Listen for prompts-changed events
  useEffect(() => {
    const unlisten = listen<Prompt[]>("prompts-changed", (event) => {
      setPrompts(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Hide window on blur
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        appWindow.hide();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Focus search input when window becomes visible
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useKeyboard({
    focusContext: "results",
    searchText,
    highlightIndex,
    flatResults,
    setHighlightIndex,
    setSearchText,
    onToggleStage: () => {
      // Phase 5: staging
    },
    onCopyAndClose: () => {
      // Phase 6: clipboard
    },
    searchInputRef,
  });

  return (
    <div className="w-[460px] min-h-[200px] max-h-[600px] bg-white dark:bg-neutral-800 rounded-xl border-[0.5px] border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl overflow-hidden flex flex-col">
      <div className="px-3 pt-3">
        <SearchBar
          ref={searchInputRef}
          value={searchText}
          onChange={setSearchText}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <ResultsList
          sections={sections}
          flatResults={flatResults}
          searchText={searchText}
          highlightIndex={highlightIndex}
          stagedPaths={new Set()}
          usageData={usageData}
          onSelect={() => {}}
          onHighlight={setHighlightIndex}
        />
      </div>
      <HintBar
        stagedCount={0}
        totalPromptCount={prompts.length}
        wordCount={0}
      />
    </div>
  );
}

export default App;
