import type { ResolvedChain } from "./types";

export interface StagedItem {
  path: string;
  repo: string;
  name: string;
  auto: boolean;
  addedBy: string | null; // path of the prompt that caused this auto-add, null if explicit
}

export function addToStaging(
  current: StagedItem[],
  chain: ResolvedChain,
  selectedPath: string,
): StagedItem[] {
  const existingPaths = new Set(current.map((i) => i.path));
  const newItems: StagedItem[] = [];

  for (const item of chain.items) {
    if (!existingPaths.has(item.path)) {
      newItems.push({
        path: item.path,
        repo: item.repo,
        name: item.name,
        auto: item.auto,
        addedBy: item.auto ? selectedPath : null,
      });
      existingPaths.add(item.path);
    }
  }

  return [...current, ...newItems];
}

export function removeFromStaging(
  current: StagedItem[],
  path: string,
  allChains: Map<string, ResolvedChain>,
): StagedItem[] {
  const removedItem = current.find((i) => i.path === path);
  if (!removedItem) return current;

  // Remove the item itself
  let result = current.filter((i) => i.path !== path);

  // If it was an explicitly selected item, check if its auto-deps are still needed
  if (!removedItem.auto) {
    // Collect all paths still needed by remaining explicit selections
    const neededPaths = new Set<string>();
    for (const item of result) {
      if (!item.auto) {
        const chain = allChains.get(item.path);
        if (chain) {
          for (const chainItem of chain.items) {
            neededPaths.add(chainItem.path);
          }
        }
      }
    }

    // Remove auto-deps that are no longer needed
    result = result.filter((i) => !i.auto || neededPaths.has(i.path));
  }

  return result;
}

export function reorderStaging(
  current: StagedItem[],
  fromIndex: number,
  toIndex: number,
): StagedItem[] {
  if (
    fromIndex < 0 ||
    fromIndex >= current.length ||
    toIndex < 0 ||
    toIndex >= current.length
  ) {
    return current;
  }
  const result = [...current];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function isStaged(staging: StagedItem[], path: string): boolean {
  return staging.some((i) => i.path === path);
}
