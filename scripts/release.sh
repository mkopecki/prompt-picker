#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Read version from tauri.conf.json
VERSION=$(grep '"version"' "$ROOT_DIR/src-tauri/tauri.conf.json" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
  echo "Error: could not read version from src-tauri/tauri.conf.json"
  exit 1
fi

TAG="v$VERSION"

# Check for uncommitted changes
if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet; then
  echo "Error: there are uncommitted changes. Commit or stash them first."
  exit 1
fi

# Check if tag already exists
if git -C "$ROOT_DIR" rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists"
  exit 1
fi

git -C "$ROOT_DIR" tag "$TAG"
echo "Created tag $TAG"

git -C "$ROOT_DIR" push origin "$TAG"
echo "Pushed $TAG to origin"
