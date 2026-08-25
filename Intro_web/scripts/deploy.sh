#!/usr/bin/env bash
# Builds Intro_web from this checkout and releases it to the production VM.
#
#   Intro_web/scripts/deploy.sh [--host ubuntu@211.119.38.216] [--allow-dirty]
#
# The repo is the single source of truth: local checkout -> build -> server.
# `apps/server/dist/` is tracked on purpose, so commit the rebuild afterwards to
# keep git, the local tree, and the server byte-identical.
#
# Only the ETS Intro Web is touched. The same VM also runs llmwiki, rag-api,
# qdrant and ollama — this script never restarts those.
set -euo pipefail

HOST=ubuntu@211.119.38.216
KEY=${ETS_DEPLOY_KEY:-/Users/donghokim/Documents/Webpage/ETS/dhkim-key.pem}
ALLOW_DIRTY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)        HOST="$2"; shift 2 ;;
    --key)         KEY="$2"; shift 2 ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ssh_() { ssh -i "$KEY" -o ConnectTimeout=15 "$HOST" "$@"; }
say()  { printf '\n[deploy] %s\n' "$*"; }

if [[ $ALLOW_DIRTY -eq 0 ]]; then
  # Ignore dist/: it is regenerated below and committed after a successful deploy.
  dirty="$(git status --porcelain -- . ':!apps/server/dist' | head -5)"
  if [[ -n "$dirty" ]]; then
    echo "working tree has uncommitted source changes:" >&2
    echo "$dirty" >&2
    echo "commit them first so git matches what is deployed (or pass --allow-dirty)." >&2
    exit 1
  fi
fi

say "1/6 building (commit $(git rev-parse --short HEAD))"
pnpm install --frozen-lockfile --silent
pnpm --filter client build > /dev/null
SERVER_BUILD_TARGET=web pnpm --filter server build > /dev/null

# The default server build target is Alibaba FC: it exports a handler and starts
# no listener, so the service would exit silently. Fail loudly instead.
grep -q "node-server" apps/server/dist/index.js || {
  echo "server bundle has no HTTP listener — build it with SERVER_BUILD_TARGET=web" >&2
  exit 1
}

say "2/6 packing"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar -czf "$TMP/client.tgz" -C apps/client/dist .
tar -czf "$TMP/server.tgz" -C apps/server dist
tar -czf "$TMP/migrations.tgz" -C apps/server migrations scripts
scp -i "$KEY" -q "$TMP/client.tgz" "$TMP/server.tgz" "$TMP/migrations.tgz" "$HOST:/tmp/"

say "3/6 releasing (previous release kept as .prev)"
ssh_ "bash -s" <<'REMOTE'
set -euo pipefail
sudo rm -rf /var/www/ets0404.prev /opt/ets-intro/apps/server/dist.prev
sudo cp -a /var/www/ets0404 /var/www/ets0404.prev
sudo cp -a /opt/ets-intro/apps/server/dist /opt/ets-intro/apps/server/dist.prev

sudo rm -rf /var/www/ets0404.new && sudo mkdir -p /var/www/ets0404.new
sudo tar -xzf /tmp/client.tgz -C /var/www/ets0404.new
sudo chown -R ubuntu:ubuntu /var/www/ets0404.new
sudo rm -rf /var/www/ets0404 && sudo mv /var/www/ets0404.new /var/www/ets0404

rm -rf /opt/ets-intro/apps/server/dist.new && mkdir -p /opt/ets-intro/apps/server/dist.new
tar -xzf /tmp/server.tgz -C /opt/ets-intro/apps/server/dist.new
rm -rf /opt/ets-intro/apps/server/dist
mv /opt/ets-intro/apps/server/dist.new/dist /opt/ets-intro/apps/server/dist
rm -rf /opt/ets-intro/apps/server/dist.new

rm -rf /opt/ets-intro/apps/server/migrations /opt/ets-intro/apps/server/scripts
tar -xzf /tmp/migrations.tgz -C /opt/ets-intro/apps/server
rm -f /tmp/client.tgz /tmp/server.tgz /tmp/migrations.tgz
REMOTE

say "4/6 migrations"
ssh_ "bash -s" <<'REMOTE'
set -euo pipefail
set -a; sudo cat /etc/ets-intro.env > /tmp/ets.env; . /tmp/ets.env; set +a
rm -f /tmp/ets.env
node /opt/ets-intro/apps/server/scripts/migrate-db.mjs
REMOTE

say "5/6 restarting the backend"
ssh_ 'sudo systemctl restart ets-intro && sleep 3 && systemctl is-active ets-intro'

say "6/6 verifying"
for path in / /solar-store /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://ets0404.com${path}" || echo 000)
  printf '  https://ets0404.com%-14s -> %s\n' "$path" "$code"
  [[ "$code" == "200" ]] || { echo "  verification failed" >&2; exit 1; }
done

say "done — commit the rebuilt apps/server/dist so git matches the server:"
echo "    git add apps/server/dist && git commit -m 'Rebuild server bundle' && git push"
echo "  rollback: sudo rm -rf /var/www/ets0404 && sudo mv /var/www/ets0404.prev /var/www/ets0404 && sudo systemctl restart ets-intro"
