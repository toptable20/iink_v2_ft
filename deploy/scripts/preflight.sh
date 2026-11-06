#!/usr/bin/env bash
# CodeDeploy BeforeInstall. Read-only: looks at the server, changes nothing.
#  MODE=diagnose -> prints a compact server report, then exits 1 ON PURPOSE so CodeDeploy
#                   stops before Install (nothing is copied or started). CI prints this report.
#  MODE=deploy   -> refuses to continue if the server is short on memory/disk or our port is taken.
source "$(dirname "$0")/common.sh"

mem_avail_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
disk_free_mb=$(df -Pm /home | awk 'NR==2 {print $4}')
our_pid="$(systemctl show -p MainPID --value "$SERVICE" 2>/dev/null || echo 0)"
pid_on_port="$(port_pid)"

if [ "$MODE" = "diagnose" ]; then
  # Kept short: CodeDeploy only returns the LAST ~2 KB of output, so the most useful parts come last.
  echo "=== IINK-V2 DIAGNOSE (read-only) ==="
  echo "os: $(. /etc/os-release; echo "$PRETTY_NAME") | kernel $(uname -r) | arch $(uname -m) | cpus $(nproc)"
  echo "uptime:$(uptime | sed 's/.*up/ up/')"
  free -m | awk 'NR==1{print "mem(MB):"$0} NR>1{print "  "$0}'
  df -Ph / /home | awk '{print "  "$1" "$2" used "$3" free "$4" "$5" "$6}'
  echo "node: $(command -v node >/dev/null && node -v || echo none) | pm2: $(command -v pm2 >/dev/null && echo yes || echo no) | docker: $(command -v docker >/dev/null && echo yes || echo no)"
  echo "web: nginx=$(systemctl is-active nginx 2>/dev/null) apache2=$(systemctl is-active apache2 2>/dev/null) php-fpm=$(systemctl list-units --type=service --state=running --no-legend 'php*' 2>/dev/null | awk '{print $1}' | tr '\n' ' ')"
  echo "home: $(ls /home | tr '\n' ' ')"
  echo "iink-v2 already: $(ls "$ROOT" 2>/dev/null | tr '\n' ' ')"
  echo "--- server_name per nginx file ---"
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -e "$f" ] || continue
    names=$(grep -hE '^\s*server_name' "$f" 2>/dev/null | sed 's/server_name//; s/;//' | tr -s ' \n' ' ')
    roots=$(grep -hoE '^\s*(root|proxy_pass)\s+[^;]+' "$f" 2>/dev/null | awk '{print $2}' | sort -u | tr '\n' ' ')
    echo "$(basename "$f"):$names -> $roots"
  done
  echo "--- listening TCP (port process) ---"
  ss -ltnpH 2>/dev/null | awk '{split($4,a,":"); port=a[length(a)]; match($0,/"[^"]+"/); p=substr($0,RSTART+1,RLENGTH-2); print port" "p}' | sort -n -u | tr '\n' ',' | sed 's/,$/\n/'
  echo "=== END DIAGNOSE — stopping on purpose, nothing installed ==="
  exit 1
fi

log "preflight: MemAvailable=${mem_avail_mb}MB, free disk /home=${disk_free_mb}MB, port $PORT pid=${pid_on_port:-none}"
[ "$mem_avail_mb" -ge 500 ] || fail "only ${mem_avail_mb}MB RAM available (<500MB). Not deploying so goyoo is not squeezed."
[ "$disk_free_mb" -ge 3072 ] || fail "only ${disk_free_mb}MB disk free on /home (<3GB). Not deploying."
if [ -n "$pid_on_port" ] && [ "$pid_on_port" != "$our_pid" ]; then
  fail "port $PORT is used by another program (pid $pid_on_port, $(ps -o comm= -p "$pid_on_port" 2>/dev/null)). Not ours — not touching it."
fi
command -v systemctl >/dev/null || fail "systemd not found"
log "preflight OK"
