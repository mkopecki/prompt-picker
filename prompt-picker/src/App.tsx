import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import {
  getPrompts,
  getResolvedChain,
  getPromptContent,
  getConfig,
  copyToClipboard,
} from "./lib/commands";
import type {
  Prompt,
  UsageData,
  FocusContext,
  ResolvedChain,
  ChainError,
} from "./lib/types";
import {
  addToStaging,
  removeFromStaging,
  reorderStaging,
  isStaged,
} from "./lib/staging";
import type { StagedItem } from "./lib/staging";
import { useSearch } from "./hooks/useSearch";
import { useKeyboard } from "./hooks/useKeyboard";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import StagingArea from "./components/StagingArea";
import HintBar from "./components/HintBar";
import "./index.css";

async function loadUsageData(): Promise<UsageData> {
  const store = await load("usage.json");
  const entries = await store.entries<{ count: number; lastUsed: string }>();
  const data: UsageData = {};
  for (const [key, value] of entries) {
    if (value && typeof value === "object" && "count" in value) {
      data[key] = value;
    }
  }
  return data;
}

async function recordUsage(paths: string[]): Promise<void> {
  const store = await load("usage.json");
  for (const path of paths) {
    const entry = await store.get<{ count: number; lastUsed: string }>(path);
    await store.set(path, {
      count: (entry?.count ?? 0) + 1,
      lastUsed: new Date().toISOString(),
    });
  }
}

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchText, setSearchText] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [usageData, setUsageData] = useState<UsageData>({});
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  const [chainCache, setChainCache] = useState<Map<string, ResolvedChain>>(
    new Map(),
  );
  const [chainErrors, setChainErrors] = useState<ChainError[]>([]);
  const [focusContext, setFocusContext] = useState<FocusContext>("results");
  const [stagingHighlight, setStagingHighlight] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { sections, flatResults } = useSearch(prompts, searchText, usageData);
  const stagedPaths = new Set(stagedItems.map((i) => i.path));

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [searchText]);

  // Load prompts and usage data on mount
  useEffect(() => {
    getPrompts().then(setPrompts);
    loadUsageData().then(setUsageData);
  }, []);

  // Listen for prompts-changed events
  useEffect(() => {
    const unlisten = listen<Prompt[]>("prompts-changed", (event) => {
      setPrompts(event.payload);
      setChainCache(new Map());
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

  // Focus search input when window gains focus
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

  // Clamp staging highlight and switch focus when staging empties
  useEffect(() => {
    if (stagingHighlight >= stagedItems.length && stagedItems.length > 0) {
      setStagingHighlight(stagedItems.length - 1);
    }
    if (stagedItems.length === 0 && focusContext === "staging") {
      setFocusContext("results");
    }
  }, [stagedItems.length, stagingHighlight, focusContext]);

  // Update word count when staging changes
  useEffect(() => {
    if (stagedItems.length === 0) {
      setWordCount(0);
      return;
    }
    Promise.all(
      stagedItems.map((item) => getPromptContent(item.path, item.repo)),
    ).then((contents) => {
      const total = contents
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
      setWordCount(total);
    });
  }, [stagedItems]);

  const handleToggleStage = useCallback(
    async (prompt: Prompt) => {
      if (isStaged(stagedItems, prompt.path)) {
        setStagedItems(
          removeFromStaging(stagedItems, prompt.path, chainCache),
        );
      } else {
        const cached = chainCache.get(prompt.path);
        const chain =
          cached ?? (await getResolvedChain(prompt.path, prompt.repo));
        if (!cached) {
          setChainCache((prev) => new Map(prev).set(prompt.path, chain));
        }
        if (chain.errors.length > 0) {
          setChainErrors((prev) => [...prev, ...chain.errors]);
        }
        setStagedItems(addToStaging(stagedItems, chain, prompt.path));
      }
    },
    [stagedItems, chainCache],
  );

  const handleCopyAndClose = useCallback(async () => {
    let itemsToCopy: StagedItem[];

    if (stagedItems.length > 0) {
      itemsToCopy = stagedItems;
    } else if (flatResults.length > 0 && flatResults[highlightIndex]) {
      const highlighted = flatResults[highlightIndex];
      itemsToCopy = [
        {
          path: highlighted.path,
          repo: highlighted.repo,
          name: highlighted.name,
          auto: false,
          addedBy: null,
        },
      ];
    } else {
      return;
    }

    // Fetch content for each item
    const contents: string[] = [];
    for (const item of itemsToCopy) {
      const content = await getPromptContent(item.path, item.repo);
      contents.push(content);
    }

    // Get separator from config
    const config = await getConfig();
    const joined = contents.join(config.separator);

    // Copy to clipboard
    await copyToClipboard(joined);

    // Record usage
    const paths = itemsToCopy.map((i) => i.path);
    await recordUsage(paths);

    // Update local usage data
    setUsageData((prev) => {
      const next = { ...prev };
      for (const path of paths) {
        next[path] = {
          count: (next[path]?.count ?? 0) + 1,
          lastUsed: new Date().toISOString(),
        };
      }
      return next;
    });

    // Clear and hide
    setStagedItems([]);
    setSearchText("");
    setChainErrors([]);
    getCurrentWindow().hide();
  }, [stagedItems, flatResults, highlightIndex]);

  const handleRemoveStaged = useCallback(
    (path: string) => {
      setStagedItems(removeFromStaging(stagedItems, path, chainCache));
    },
    [stagedItems, chainCache],
  );

  const handleReorder = useCallback(
    (from: number, to: number) => {
      setStagedItems(reorderStaging(stagedItems, from, to));
    },
    [stagedItems],
  );

  useKeyboard({
    focusContext,
    searchText,
    highlightIndex,
    flatResults,
    stagedItems,
    stagingHighlight,
    setHighlightIndex,
    setSearchText,
    setStagingHighlight,
    onToggleStage: handleToggleStage,
    onCopyAndClose: handleCopyAndClose,
    onSwitchToStaging: () => setFocusContext("staging"),
    onSwitchToResults: () => setFocusContext("results"),
    onRemoveStaged: handleRemoveStaged,
    onReorder: handleReorder,
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
          stagedPaths={stagedPaths}
          usageData={usageData}
          onSelect={handleToggleStage}
          onHighlight={setHighlightIndex}
        />
      </div>
      {stagedItems.length > 0 && (
        <StagingArea
          items={stagedItems}
          highlightIndex={stagingHighlight}
          isActive={focusContext === "staging"}
          errors={chainErrors}
          onRemove={handleRemoveStaged}
        />
      )}
      <HintBar
        stagedCount={stagedItems.length}
        totalPromptCount={prompts.length}
        wordCount={wordCount}
      />
    </div>
  );
}

export default App;
