#!/usr/bin/env bash
# CodeDeploy ApplicationStart. Atomically points "current" at the new release and restarts ONLY our service.
source "$(dirname "$0")/common.sh"
[ "$MODE" = "deploy" ] || fail "unexpected MODE=$MODE"

RELEASE_ID="$(cat "$STATE")"
[ -d "$RELEASES/$RELEASE_ID" ] || fail "release $RELEASE_ID missing"

# Remember what was live, for rollback in validate.sh.
if [ -L "$CURRENT" ]; then readlink "$CURRENT" > "$BASE/.previous"; else rm -f "$BASE/.previous"; fi

ln -sfn "$RELEASES/$RELEASE_ID" "$CURRENT.tmp"
mv -T "$CURRENT.tmp" "$CURRENT"
systemctl restart "$SERVICE"
log "switched to $RELEASE_ID and restarted $SERVICE"
