#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if ! pnpm generate:registry:check 2>/dev/null; then
  echo "Registry files are stale. Regenerating..."
  pnpm generate:registry
  git add app/lib/registry/generated/
  echo "Registry files regenerated and staged."
fi

echo "Building type declarations..."
pnpm build:types

echo "Running TypeScript type check..."
cd app && pnpm tsc --noEmit && cd ..
echo "TypeScript check passed."

echo "Linting GDScript..."
pnpm lint:gdscript
echo "GDScript lint passed."

pnpm hush check --only-changed
