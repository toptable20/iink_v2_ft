#!/usr/bin/env bash
# CodeDeploy AfterInstall. Builds a new release folder next to the running one.
# The running site is not affected until start.sh switches the "current" link.
source "$(dirname "$0")/common.sh"
[ "$MODE" = "deploy" ] || fail "unexpected MODE=$MODE"

RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-${DEPLOYMENT_ID:-manual}"
RELEASE="$RELEASES/$RELEASE_ID"

# 1. Service user (no login, no home) — can read our code, cannot write it, cannot touch other users' files.
if ! id "$RUN_USER" >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$RUN_USER"
  log "created system user $RUN_USER"
fi

mkdir -p "$RELEASES" "$SHARED" "$RUNTIME_DIR"

# 2. Secrets -> /etc/iink-v2/<app>.env (root only), then removed from the bundle copy.
install -d -m 700 -o root -g root "$ENV_DIR"
if [ -s "$INCOMING/deploy/app.env" ]; then
  install -m 600 -o root -g root "$INCOMING/deploy/app.env" "$ENV_FILE"
  # Empty the bundle copy (incoming/ is readable by other users). Emptied, not deleted, so CodeDeploy's cleanup still finds it.
  : > "$INCOMING/deploy/app.env"
  chmod 600 "$INCOMING/deploy/app.env"
  log "secrets updated ($ENV_FILE)"
fi
if [ ! -f "$ENV_FILE" ]; then touch "$ENV_FILE"; fi
chmod 600 "$ENV_FILE"

# 3. Our own Node.js runtime (versioned; shared by ft and bc; never replaces a system Node).
NODE_VER="$(cat "$INCOMING/deploy/runtime/VERSION")"
if [ ! -x "$RUNTIME_DIR/node-$NODE_VER/bin/node" ]; then
  cp -a "$INCOMING/deploy/runtime/node" "$RUNTIME_DIR/node-$NODE_VER.tmp"
  mv -T "$RUNTIME_DIR/node-$NODE_VER.tmp" "$RUNTIME_DIR/node-$NODE_VER"
  log "installed Node $NODE_VER"
fi
"$RUNTIME_DIR/node-$NODE_VER/bin/node" -v >/dev/null || fail "bundled Node does not run on this server"

# 4. Release folder = the app files only (no deploy scripts, no secrets).
cp -a "$INCOMING/app" "$RELEASE.tmp"
mv -T "$RELEASE.tmp" "$RELEASE"
echo "$NODE_VER" > "$RELEASE/.node-version"
# Writable data lives in shared/ so it survives releases (e.g. backend uploads).
for d in ${SHARED_DIRS:-}; do
  mkdir -p "$SHARED/$d"
  chown -R "$RUN_USER:$RUN_USER" "$SHARED/$d"
  rm -rf "${RELEASE:?}/$d"
  ln -s "$SHARED/$d" "$RELEASE/$d"
done
chown -R root:"$RUN_USER" "$RELEASE"
chmod -R u=rwX,g=rX,o= "$RELEASE"

# 5. systemd unit (ours only). Placeholders filled from app.conf.
sed -e "s|@APP@|$APP|g" -e "s|@PORT@|$PORT|g" -e "s|@CURRENT@|$CURRENT|g" \
    -e "s|@NODE@|$RUNTIME_DIR/node-$NODE_VER/bin/node|g" -e "s|@START@|$START_CMD|g" \
    -e "s|@MEMORY_MAX@|$MEMORY_MAX|g" -e "s|@ENV_FILE@|$ENV_FILE|g" -e "s|@SHARED@|$SHARED|g" \
    "$INCOMING/deploy/systemd/service.template" > "$UNIT_FILE.tmp"
mv -T "$UNIT_FILE.tmp" "$UNIT_FILE"
chmod 644 "$UNIT_FILE"
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1

echo "$RELEASE_ID" > "$STATE"
log "release $RELEASE_ID prepared"
