import { invoke } from "@tauri-apps/api/core";

export interface Repo {
  name: string;
  path: string;
}

export interface Config {
  shortcut: string;
  separator: string;
  repos: Repo[];
}

export async function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

export async function openConfig(): Promise<void> {
  return invoke("open_config");
}
