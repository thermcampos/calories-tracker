#!/usr/bin/env bash
# Packages the nutrition-info Appwrite Function into a .tar.gz for manual deployment
# (Appwrite Console > Functions > nutrition-info > Deployments > Create deployment > Manual).
#
#   Entrypoint:     src/main.js
#   Build command:  npm ci --omit=dev
#
# Usage: scripts/package-function.sh [output-dir]   (default: dist-functions/)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FUNC_DIR="$ROOT/functions/nutrition-info"
OUT_DIR="${1:-$ROOT/dist-functions}"
ARCHIVE="$OUT_DIR/nutrition-info.tar.gz"

# 1. Allowlist of food names, extracted from the frontend's food database so both stay in sync
node --input-type=module - "$ROOT/src/foodDatabase.ts" "$FUNC_DIR/src/foodNames.json" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const [source, target] = process.argv.slice(2);
const text = readFileSync(source, 'utf8');
const names = [...text.matchAll(/^\s*\{\s*name:\s*(['"])(.*?)\1/gm)].map((m) => m[2]);
const entries = (text.match(/^\s*\{\s*name:/gm) || []).length;
if (names.length === 0 || names.length !== entries) {
  console.error(`Extracted ${names.length} names from ${entries} food entries; check the regex in package-function.sh`);
  process.exit(1);
}
writeFileSync(target, JSON.stringify([...new Set(names)], null, 2) + '\n');
console.log(`foodNames.json: ${names.length} foods`);
JS

# 2. Lockfile so the Appwrite build installs exactly what was tested
(cd "$FUNC_DIR" && npm install --package-lock-only --silent)

# 3. Syntax check before shipping
node --check "$FUNC_DIR/src/main.js"

# 4. Archive (sources only; Appwrite runs the build command to install dependencies)
mkdir -p "$OUT_DIR"
tar -czf "$ARCHIVE" -C "$FUNC_DIR" package.json package-lock.json src
echo "Created $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
tar -tzf "$ARCHIVE"
