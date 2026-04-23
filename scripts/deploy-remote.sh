#!/usr/bin/env bash
# Deploy frontend + backend to Oracle VM (same steps as legacy deploy.sh).
# Usage: DEPLOY_SSH_KEY_PATH=/path/to/key.pem bash scripts/deploy-remote.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

KEY="${DEPLOY_SSH_KEY_PATH:-}"
if [[ -z "$KEY" || ! -f "$KEY" ]]; then
  echo "Set DEPLOY_SSH_KEY_PATH to your Oracle SSH private key (.pem)." >&2
  exit 1
fi
chmod 600 "$KEY"

SERVER="${DEPLOY_SERVER:-ubuntu@141.148.236.58}"
# DEPLOY_SSH_STRICT_HOST_KEY=1: do not disable host key check (add host via ssh-keyscan first, e.g. in CI).
if [[ "${DEPLOY_SSH_STRICT_HOST_KEY:-0}" == "1" ]]; then
  SSH=(ssh -i "$KEY")
  RSYNC=(rsync -avz --delete -e "ssh -i ${KEY}")
else
  SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=no)
  RSYNC=(rsync -avz --delete -e "ssh -i ${KEY} -o StrictHostKeyChecking=no")
fi

if [[ "${SKIP_NPM_BUILD:-}" == "1" ]]; then
  echo "Skipping npm run build (SKIP_NPM_BUILD=1)"
else
  echo "Building frontend..."
  npm run build
fi

echo "Deploying frontend..."
"${RSYNC[@]}" dist/ "${SERVER}:/home/ubuntu/cargo/dist/"

echo "Syncing backend..."
"${RSYNC[@]}" backend/ "${SERVER}:/home/ubuntu/cargo/backend/" \
  --exclude="server" --exclude="*.log"

echo "Applying DB patches and restarting backend..."
"${SSH[@]}" "$SERVER" 'bash -s' <<'REMOTE'
set -e
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/cargotrans?sslmode=disable}"
export DATABASE_URL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipments_from_to_station_check'
  ) THEN
    ALTER TABLE shipments
      ADD CONSTRAINT shipments_from_to_station_check
      CHECK (lower(btrim(from_station)) <> lower(btrim(to_station)));
  END IF;
END
$$;
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS frequent_clients (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  company_name TEXT,
  client_name TEXT NOT NULL,
  phone TEXT,
  contract_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE users
SET role = 'manager'
WHERE role = 'operator';
SQL

cd /home/ubuntu/cargo/backend
export PATH="$PATH:/usr/local/go/bin"
go build -o server ./cmd/server
sudo systemctl restart cargo
echo "Backend restarted."
REMOTE

echo "Deploy complete: http://141.148.236.58"
