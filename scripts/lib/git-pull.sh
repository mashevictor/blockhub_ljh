#!/usr/bin/env bash
# Git pull for servers: SSH:22 blocked → SSH:443 → HTTPS (public repos only).
# Source: source "$ROOT/scripts/lib/git-pull.sh"
set -euo pipefail

_git_ssh_to_https() {
  local url="$1"
  case "$url" in
    git@github.com:*)
      echo "https://github.com/${url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      echo "https://github.com/${url#ssh://git@github.com/}"
      ;;
    *)
      echo "$url"
      ;;
  esac
}

_git_https_to_ssh() {
  local url="$1"
  case "$url" in
    https://github.com/*)
      echo "git@github.com:${url#https://github.com/}"
      ;;
    *)
      echo "$url"
      ;;
  esac
}

# Ensure ~/.ssh/config uses GitHub SSH over 443 (when port 22 is blocked).
_ensure_github_ssh_443() {
  mkdir -p ~/.ssh
  chmod 700 ~/.ssh
  if [ ! -f ~/.ssh/config ] || ! grep -q 'Host github.com' ~/.ssh/config 2>/dev/null; then
    cat >> ~/.ssh/config <<'EOF'

Host github.com
  Hostname ssh.github.com
  Port 443
  User git
  StrictHostKeyChecking accept-new
EOF
    chmod 600 ~/.ssh/config
    echo "    added ~/.ssh/config → github.com via port 443"
  fi
}

_git_try_fetch() {
  GIT_TERMINAL_PROMPT=0 git fetch origin "$@"
}

# Pull latest main without interactive HTTPS username/password.
blockhub_git_pull() {
  local branch="${1:-main}"

  if [ "${SKIP_GIT_PULL:-}" = "1" ]; then
    echo "    SKIP_GIT_PULL=1 — skip git pull (HEAD=$(git rev-parse --short HEAD 2>/dev/null || echo unknown))"
    return 0
  fi

  git checkout -- home/package-lock.json runtime-app/pubspec.lock 2>/dev/null || true

  local origin_url ssh_url
  origin_url="$(git remote get-url origin 2>/dev/null || echo "")"

  # Private repos: HTTPS always prompts for user/pass — prefer SSH (443).
  case "$origin_url" in
    https://github.com/*)
      ssh_url="$(_git_https_to_ssh "$origin_url")"
      echo "WARN: HTTPS origin prompts for credentials on private repos — switching to SSH"
      git remote set-url origin "$ssh_url"
      origin_url="$ssh_url"
      ;;
  esac

  if [[ "$origin_url" == git@github.com:* ]] || [[ "$origin_url" == ssh://git@github.com/* ]]; then
    _ensure_github_ssh_443
    if _git_try_fetch && git pull origin "$branch"; then
      return 0
    fi
    echo "WARN: git over SSH failed — if you see 'Permission denied (publickey)':"
    echo "       add this server's key to GitHub → Settings → Deploy keys (read-only):"
    ssh-keygen -y -f ~/.ssh/id_ed25519 2>/dev/null || ssh-keygen -y -f ~/.ssh/id_rsa 2>/dev/null || true
    return 1
  fi

  if _git_try_fetch && git pull origin "$branch"; then
    return 0
  fi

  local https_url="$(_git_ssh_to_https "$origin_url")"
  if [ "$https_url" != "$origin_url" ]; then
    echo "WARN: trying HTTPS (only works for public repos without login)"
    git remote set-url origin "$https_url"
    if GIT_TERMINAL_PROMPT=0 git -c credential.helper= fetch origin && git pull origin "$branch"; then
      return 0
    fi
  fi

  echo "ERROR: git pull failed."
  echo "  Private repo: use SSH + deploy key (bash scripts/fix-github-git.sh)"
  echo "  Skip pull:    SKIP_GIT_PULL=1 bash scripts/deploy.sh"
  return 1
}
