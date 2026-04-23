#!/usr/bin/env bash
# Wrapper: local Oracle deploy (key default: tz/ssh-key-cargo.pem or override path).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export DEPLOY_SSH_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-$ROOT/tz/ssh-key-cargo.pem}"
exec bash "$ROOT/scripts/deploy-remote.sh"
