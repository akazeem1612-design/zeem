#!/usr/bin/env bash
set -euo pipefail

echo "Running Next.js production build..."
npx next build

echo "Build verified successfully."
