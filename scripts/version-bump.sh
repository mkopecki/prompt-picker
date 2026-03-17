#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.2.0"
  exit 1
fi

VERSION="$1"

if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  echo "Error: '$VERSION' is not a valid semver version"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Update package.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT_DIR/package.json"
echo "Updated package.json"

# Update src-tauri/tauri.conf.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT_DIR/src-tauri/tauri.conf.json"
echo "Updated src-tauri/tauri.conf.json"

# Update src-tauri/Cargo.toml (first occurrence only)
awk -v ver="$VERSION" '!done && /^version = "/ { sub(/^version = "[^"]*"/, "version = \"" ver "\""); done=1 } 1' \
  "$ROOT_DIR/src-tauri/Cargo.toml" > "$ROOT_DIR/src-tauri/Cargo.toml.tmp" \
  && mv "$ROOT_DIR/src-tauri/Cargo.toml.tmp" "$ROOT_DIR/src-tauri/Cargo.toml"
echo "Updated src-tauri/Cargo.toml"

echo "Version bumped to $VERSION"
