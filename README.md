# prompt-utils

A macOS menubar utility for composing LLM prompts from reusable components. Press a keyboard shortcut, search your prompt library, select and combine pieces, and get the result on your clipboard — ready to paste.

Built for people who maintain prompt collections as markdown files (works great with Obsidian vaults).

## How it works

You keep your prompts as `.md` files in one or more folders on disk. prompt-utils indexes them, lets you search and select components, resolves dependencies between them, and copies the combined result to your clipboard.

**Open the picker** — press `Cmd+Shift+P` (configurable) or click the menubar icon.

**Search** — start typing to fuzzy-search by name. Type `#coding` to filter by tag.

**Select** — press `Tab` to add the highlighted prompt to the staging area. If it depends on other prompts (via `extends`), those are pulled in automatically.

**Copy** — press `Enter`. All staged components are concatenated in order, frontmatter is stripped, and the result is on your clipboard.

### The extends system

Prompts can declare dependencies on other prompts. A file like `code-review.md` can extend `base-system-prompt.md` and `mentor-persona.md`. When you select it, the full chain is assembled automatically:

```
1. base-system-prompt.md    (auto)
2. mentor-persona.md        (auto)
3. code-review.md           (selected)
```

Dependencies resolve transitively and are deduplicated. You always see the full chain before copying.

### Prompt frontmatter

prompt-utils uses standard YAML frontmatter that's fully compatible with Obsidian:

```yaml
---
type: prompt
name: "Code review expert"
extends:
  - base/system-prompt.md
  - personas/mentor.md
tags:
  - coding
  - review
pinned: true
---
You are an expert code reviewer. Focus on correctness,
performance, readability, and security...
```

| Field          | Description                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `type: prompt` | Marks the file as a first-class prompt (prioritized in search). Files without this still work, just ranked lower. |
| `name`         | Display name in the picker. Falls back to the filename if not set.                                                |
| `extends`      | Ordered list of file paths (relative to repo root) that get auto-included when this prompt is selected.           |
| `tags`         | Filterable tags. Search with `#tagname` in the picker. Obsidian-compatible format.                                |
| `pinned`       | Shows the prompt in the Pinned section at the top of the picker.                                                  |

Files without any frontmatter are still indexed and selectable — they just appear with lower priority in search results.

## Installation

### From releases

Download the latest `.dmg` from [Releases](../../releases), open it, and drag prompt-utils to your Applications folder.

### From source

Requirements:

- [Rust](https://rustup.rs/) (latest stable)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/) (`xcode-select --install`)
- [bun](https://bun.sh/)

```bash
git clone https://github.com/yourname/prompt-utils.git
cd prompt-utils
bun install
bun tauri build
```

The built `.app` and `.dmg` will be in `src-tauri/target/release/bundle/`.

For development with hot-reload:

```bash
bun tauri dev
```

## Configuration

On first launch, prompt-utils creates a config file at:

```
~/.config/prompt-utils/config.toml
```

Edit it to point to your prompt folders:

```toml
# Keyboard shortcut to open the picker
shortcut = "Cmd+Shift+P"

# Separator between prompt components when copying
separator = "\n\n---\n\n"

# Add your prompt folders here
[[repos]]
name = "My Prompts"
path = "~/Documents/Obsidian/prompts"

[[repos]]
name = "Work"
path = "~/work/prompt-library"
```

The app watches this file and reloads automatically when you save changes.

## Keyboard shortcuts

The picker is designed to be used entirely from the keyboard.

| Key                 | Action                                                   |
| ------------------- | -------------------------------------------------------- |
| `↑` `↓`             | Navigate the results list                                |
| `Tab`               | Add/remove highlighted item to staging area              |
| `Enter`             | Copy staged content to clipboard and close               |
| `Esc`               | Clear search (first press) / close window (second press) |
| `Cmd+C`             | Clear all (search text + staged items)                   |
| `Shift+↑` `Shift+↓` | Reorder items in the staging area                        |
| `Cmd+↓`             | Switch focus to staging area                             |
| `Cmd+↑`             | Switch focus back to results                             |
| `#tagname`          | Filter by tag (type in search bar)                       |

## How prompts are organized

prompt-utils scans all `.md` files recursively in your configured folders. It groups them into three tiers:

1. **Pinned** — prompts with `pinned: true` in frontmatter. Always at the top.
2. **Frequent** — automatically tracked by usage count. The more you use a prompt, the higher it ranks.
3. **All prompts** — everything else, with typed prompts (`type: prompt`) shown before plain markdown files.

When you search, all tiers collapse into a single ranked list.

## Tech stack

- [Tauri v2](https://v2.tauri.app/) — Rust backend, system WebKit frontend
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

The app is ~5 MB, uses no Chromium, and has near-zero idle resource usage.

## Tray icon

prompt-utils lives in your macOS menubar with no dock icon. Right-click the tray icon for:

- **Open config** — opens `config.toml` in your default editor
- **Reload** — rescans all prompt folders
- **Quit**

## License

MIT
