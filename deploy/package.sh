#!/usr/bin/env bash
# Runs in GitHub Actions (Linux). Builds the CodeDeploy bundle folder: build/bundle
#   deploy/package.sh diagnose  -> appspec + scripts only (no app, no Node)
#   deploy/package.sh deploy    -> + app (Next.js standalone server, static files, public/) + Node runtime
# Expects: release/ from the CI job (standalone server + .next/static + public).
set -euo pipefail
MODE="${1:?usage: deploy/package.sh diagnose|deploy}"
NODE_VERSION="${NODE_VERSION:?NODE_VERSION not set}"
cd "$(dirname "$0")/.."

OUT=build/bundle
rm -rf build && mkdir -p "$OUT/deploy"
cp appspec.yml "$OUT/"
cp -r deploy/scripts deploy/systemd deploy/app.conf "$OUT/deploy/"
echo "$MODE" > "$OUT/deploy/MODE"

if [ "$MODE" = "deploy" ]; then
  [ -f release/server.js ] || { echo "release/server.js missing (CI build artifact)"; exit 1; }
  cp -a release "$OUT/app"
  # Never ship env files, even if one slipped into the build.
  find "$OUT/app" -maxdepth 1 -name '.env*' -exec rm -f {} +

  tarball="node-v$NODE_VERSION-linux-x64.tar.xz"
  curl -fsSLo "build/$tarball" "https://nodejs.org/dist/v$NODE_VERSION/$tarball"
  (cd build && curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" | grep " $tarball\$" | sha256sum -c -)
  mkdir -p "$OUT/deploy/runtime"
  tar -xJf "build/$tarball" -C build
  mv "build/node-v$NODE_VERSION-linux-x64" "$OUT/deploy/runtime/node"
  rm -rf "$OUT/deploy/runtime/node/"{include,share,lib/node_modules/npm,lib/node_modules/corepack,bin/npm,bin/npx,bin/corepack}
  echo "$NODE_VERSION" > "$OUT/deploy/runtime/VERSION"
fi

find "$OUT/deploy" -name '*.sh' -exec sed -i 's/\r$//' {} + -exec chmod 755 {} +
sed -i 's/\r$//' "$OUT/deploy/app.conf" "$OUT/appspec.yml"
echo "bundle folder ready: $OUT ($MODE)."
