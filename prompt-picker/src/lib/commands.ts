import { invoke } from "@tauri-apps/api/core";
import type { Config, Prompt } from "./types";

export async function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

export async function openConfig(): Promise<void> {
  return invoke("open_config");
}

export async function getPrompts(): Promise<Prompt[]> {
  return invoke<Prompt[]>("get_prompts");
}

export async function rescan(): Promise<Prompt[]> {
  return invoke<Prompt[]>("rescan");
}
