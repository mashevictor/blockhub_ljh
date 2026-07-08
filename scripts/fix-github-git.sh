#!/usr/bin/env bash
# Fix GitHub pull on server — no HTTPS username/password (use SSH port 443 + deploy key).
# Usage: bash scripts/fix-github-git.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " Fix GitHub Git (no HTTPS password)"
echo "=========================================="

REPO_SSH="git@github.com:mashevictor/blockhub.git"
git remote set-url origin "$REPO_SSH"
echo "origin -> $REPO_SSH"

mkdir -p ~/.ssh
chmod 700 ~/.ssh
if ! grep -q 'Host github.com' ~/.ssh/config 2>/dev/null; then
  cat >> ~/.ssh/config <<'EOF'

Host github.com
  Hostname ssh.github.com
  Port 443
  User git
  StrictHostKeyChecking accept-new
EOF
fi
chmod 600 ~/.ssh/config
echo "✓ ~/.ssh/config → github.com:443"

if [ ! -f ~/.ssh/id_ed25519 ] && [ ! -f ~/.ssh/id_rsa ]; then
  echo ""
  echo ">>> Generating deploy key (no passphrase)..."
  ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519 -C "blockhub-deploy@$(hostname)"
fi

PUB=""
[ -f ~/.ssh/id_ed25519.pub ] && PUB=~/.ssh/id_ed25519.pub
[ -z "$PUB" ] && [ -f ~/.ssh/id_rsa.pub ] && PUB=~/.ssh/id_rsa.pub

echo ""
echo ">>> Add this public key to GitHub (one-time):"
echo "    Repo → Settings → Deploy keys → Add deploy key (read-only)"
echo ""
cat "$PUB"
echo ""

echo ">>> Testing SSH..."
if ssh -T git@github.com 2>&1 | grep -qiE 'successfully authenticated|Hi '; then
  echo "✓ SSH OK"
  git fetch origin && git pull origin main
  echo "✓ git pull OK — run: bash scripts/deploy.sh"
else
  echo "✗ SSH not authorized yet — paste the key above into GitHub Deploy keys, then:"
  echo "    git fetch origin && git pull origin main"
  echo "    bash scripts/deploy.sh"
  exit 1
fi
