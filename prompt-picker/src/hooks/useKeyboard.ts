import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Prompt, FocusContext } from "../lib/types";

interface UseKeyboardParams {
  focusContext: FocusContext;
  searchText: string;
  highlightIndex: number;
  flatResults: Prompt[];
  setHighlightIndex: (i: number) => void;
  setSearchText: (s: string) => void;
  onToggleStage: (prompt: Prompt) => void;
  onCopyAndClose: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useKeyboard({
  focusContext,
  searchText,
  highlightIndex,
  flatResults,
  setHighlightIndex,
  setSearchText,
  onToggleStage,
  onCopyAndClose,
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
        return; // let the event propagate to the input
      }

      if (focusContext === "results") {
        switch (e.key) {
          case "ArrowDown": {
            e.preventDefault();
            if (flatResults.length > 0) {
              setHighlightIndex(
                (highlightIndex + 1) % flatResults.length,
              );
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
          case "Enter": {
            e.preventDefault();
            onCopyAndClose();
            break;
          }
          case "Escape": {
            e.preventDefault();
            if (searchText) {
              setSearchText("");
            } else {
              getCurrentWindow().hide();
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
    setHighlightIndex,
    setSearchText,
    onToggleStage,
    onCopyAndClose,
    searchInputRef,
  ]);
}
