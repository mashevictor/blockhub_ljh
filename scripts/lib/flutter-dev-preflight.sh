#!/usr/bin/env bash
# Shared preflight before flutter analyze in batch6/7/8
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=flutter-dev-reset.sh
source "$ROOT/scripts/flutter-dev-reset.sh"
