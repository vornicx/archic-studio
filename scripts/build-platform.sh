#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"

if [[ "${VERCEL:-}" == "1" ]]; then
  echo "Vercel detected: building the native Next.js output..."
  exec "${project_root}/node_modules/.bin/next" build --webpack
fi

exec "${script_dir}/build-verified.sh" "$@"
