import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Prompt, FocusContext } from "../lib/types";
import type { StagedItem } from "../lib/staging";

interface UseKeyboardParams {
  focusContext: FocusContext;
  searchText: string;
  highlightIndex: number;
  flatResults: Prompt[];
  stagedItems: StagedItem[];
  stagingHighlight: number;
  setHighlightIndex: (i: number) => void;
  setSearchText: (s: string) => void;
  setStagingHighlight: (i: number) => void;
  onToggleStage: (prompt: Prompt) => void;
  onCopyAndClose: () => void;
  onSwitchToStaging: () => void;
  onSwitchToResults: () => void;
  onRemoveStaged: (path: string) => void;
  onReorder: (from: number, to: number) => void;
  onClearAll: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useKeyboard({
  focusContext,
  searchText,
  highlightIndex,
  flatResults,
  stagedItems,
  stagingHighlight,
  setHighlightIndex,
  setSearchText,
  setStagingHighlight,
  onToggleStage,
  onCopyAndClose,
  onSwitchToStaging,
  onSwitchToResults,
  onRemoveStaged,
  onReorder,
  onClearAll,
  searchInputRef,
}: UseKeyboardParams) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Always ensure search input has focus for typing
      if (
        e.key.length === 1 &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement !== searchInputRef.current
      ) {
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (searchText) {
          setSearchText("");
        } else {
          // Clear staging and hide
          getCurrentWindow().hide();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        onCopyAndClose();
        return;
      }

      // Cmd+C: clear all (search + staged items)
      if (e.key === "c" && e.metaKey) {
        e.preventDefault();
        onClearAll();
        return;
      }

      if (focusContext === "results") {
        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            if (e.metaKey && stagedItems.length > 0) {
              onSwitchToStaging();
            } else if (flatResults.length > 0) {
              setHighlightIndex((highlightIndex + 1) % flatResults.length);
            }
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            if (flatResults.length > 0) {
              setHighlightIndex(
                (highlightIndex - 1 + flatResults.length) % flatResults.length,
              );
            }
            break;
          }
          case "Tab": {
            e.preventDefault();
            if (flatResults[highlightIndex]) {
              onToggleStage(flatResults[highlightIndex]);
            }
            break;
          }
        }
      } else if (focusContext === "staging") {
        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            if (e.shiftKey && stagingHighlight < stagedItems.length - 1) {
              onReorder(stagingHighlight, stagingHighlight + 1);
              setStagingHighlight(stagingHighlight + 1);
            } else if (!e.shiftKey && stagedItems.length > 0) {
              setStagingHighlight(
                (stagingHighlight + 1) % stagedItems.length,
              );
            }
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            if (e.metaKey) {
              onSwitchToResults();
            } else if (e.shiftKey && stagingHighlight > 0) {
              onReorder(stagingHighlight, stagingHighlight - 1);
              setStagingHighlight(stagingHighlight - 1);
            } else if (!e.shiftKey && stagedItems.length > 0) {
              setStagingHighlight(
                (stagingHighlight - 1 + stagedItems.length) %
                  stagedItems.length,
              );
            }
            break;
          }
          case "Tab": {
            if (e.shiftKey) {
              e.preventDefault();
              if (stagedItems[stagingHighlight]) {
                onRemoveStaged(stagedItems[stagingHighlight].path);
              }
            }
            break;
          }
          case "Backspace":
          case "Delete": {
            // Only handle if search is empty (otherwise let it delete text)
            if (!searchText && stagedItems[stagingHighlight]) {
              e.preventDefault();
              onRemoveStaged(stagedItems[stagingHighlight].path);
            }
            break;
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    focusContext,
    searchText,
    highlightIndex,
    flatResults,
    stagedItems,
    stagingHighlight,
    setHighlightIndex,
    setSearchText,
    setStagingHighlight,
    onToggleStage,
    onCopyAndClose,
    onSwitchToStaging,
    onSwitchToResults,
    onRemoveStaged,
    onReorder,
    onClearAll,
    searchInputRef,
  ]);
}
