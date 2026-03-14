export interface Prompt {
  path: string;
  repo: string;
  name: string;
  type: "prompt" | null;
  tags: string[];
  pinned: boolean;
  extends: string[];
  hasExtends: boolean;
  extendsCount: number;
}

export interface Repo {
  name: string;
  path: string;
}

export interface Config {
  shortcut: string;
  separator: string;
  repos: Repo[];
}

export type FocusContext = "results" | "staging";

export interface UsageData {
  [path: string]: { count: number; lastUsed: string };
}
