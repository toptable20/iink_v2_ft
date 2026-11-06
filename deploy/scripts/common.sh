#!/usr/bin/env bash
# Shared settings for the CodeDeploy hook scripts. Sourced, never run directly.
#
# SAFETY CONTRACT — these scripts run as root on a SHARED server (goyoo also lives there).
# They may only create/change:
#   /home/iink-v2/<app>/...           our releases, shared files, incoming bundle
#   /home/iink-v2/runtime/...         our own Node.js (goyoo's Node, if any, is never touched)
#   /etc/iink-v2/<app>.env            our secrets (root-only, 600)
#   /etc/systemd/system/iink-v2-<app>.service   our service
#   system user "iinkv2"              runs our services
# They never touch nginx/apache, /home/iink (old site), goyoo, pm2, docker, packages or firewall.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"          # .../deploy inside the bundle
# shellcheck source=/dev/null
source "$DEPLOY_DIR/app.conf"                  # APP, PORT, HEALTH_PATH, START_CMD, MEMORY_MAX, KEEP_RELEASES

MODE="$(cat "$DEPLOY_DIR/MODE" 2>/dev/null || echo deploy)"
ROOT=/home/iink-v2
BASE="$ROOT/$APP"
INCOMING="$BASE/incoming"                      # appspec copies the bundle here
RELEASES="$BASE/releases"
SHARED="$BASE/shared"
CURRENT="$BASE/current"
RUNTIME_DIR="$ROOT/runtime"
ENV_DIR=/etc/iink-v2
ENV_FILE="$ENV_DIR/$APP.env"
SERVICE="iink-v2-$APP"
UNIT_FILE="/etc/systemd/system/$SERVICE.service"
RUN_USER=iinkv2
STATE="$BASE/.deploy-state"                    # release id of the deployment in progress

log() { printf '[iink-v2/%s] %s\n' "$APP" "$*"; }
fail() { printf '[iink-v2/%s] FAILED: %s\n' "$APP" "$*" >&2; exit 1; }

# PID of whatever listens on our port (empty if nothing).
port_pid() { ss -ltnpH "sport = :$PORT" 2>/dev/null | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2 || true; }
