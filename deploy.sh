#!/bin/bash
# ==============================================
# CargoTrans Deploy Script → 141.148.236.58
# ==============================================
set -e

SERVER="ubuntu@141.148.236.58"
KEY="./ssh-key-cargo.pem"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
RSYNC="rsync -avz --delete -e \"ssh -i $KEY -o StrictHostKeyChecking=no\""

echo "🔨 Building frontend..."
npm run build

echo "🚀 Deploying frontend to server..."
rsync -avz --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  dist/ $SERVER:/home/ubuntu/cargo/dist/

echo "📦 Syncing backend source..."
rsync -avz --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  backend/ $SERVER:/home/ubuntu/cargo/backend/ \
  --exclude="server" --exclude="*.log"

echo "🔧 Building and restarting backend..."
$SSH $SERVER "
  cd /home/ubuntu/cargo/backend &&
  export PATH=\$PATH:/usr/local/go/bin &&
  go build -o server ./cmd/server &&
  sudo systemctl restart cargo &&
  echo '✅ Backend restarted!'
"

echo ""
echo "✅ Deploy complete!"
echo "🌐 http://141.148.236.58"
