#!/usr/bin/env bash
# CodeDeploy ValidateService. The new release must answer on 127.0.0.1:<port> within 90 s.
# If it does not: switch back to the previous release automatically, then fail the deployment.
source "$(dirname "$0")/common.sh"
[ "$MODE" = "deploy" ] || fail "unexpected MODE=$MODE"

healthy() {
  systemctl is-active --quiet "$SERVICE" &&
    curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$PORT$HEALTH_PATH"
}

for _ in $(seq 1 30); do
  if healthy; then
    log "healthy: http://127.0.0.1:$PORT$HEALTH_PATH"
    # Keep the newest releases, delete older ones (never the live one).
    live="$(readlink -f "$CURRENT")"
    ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
      [ "$(readlink -f "$old")" = "$live" ] || rm -rf "$old"
    done
    exit 0
  fi
  sleep 3
done

log "NOT healthy after 90s. Last service log lines:"
journalctl -u "$SERVICE" -n 25 --no-pager -o cat 2>/dev/null | cut -c1-200 || true

if [ -f "$BASE/.previous" ] && [ -d "$(cat "$BASE/.previous")" ]; then
  ln -sfn "$(cat "$BASE/.previous")" "$CURRENT.tmp"
  mv -T "$CURRENT.tmp" "$CURRENT"
  systemctl restart "$SERVICE"
  log "ROLLED BACK to $(basename "$(cat "$BASE/.previous")")"
else
  systemctl stop "$SERVICE" || true
  log "no previous release (first deploy) — service stopped; old site is unaffected"
fi
fail "new release did not become healthy"
