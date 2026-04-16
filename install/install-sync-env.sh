#!/bin/bash
set -euo pipefail

REPO="${SYNC_ENV_REPO:-your-org/dev-tools}"
REF="${SYNC_ENV_REF:-main}"
BIN_DIR="${SYNC_ENV_BIN_DIR:-$HOME/.local/bin}"
COMMAND_NAME="${SYNC_ENV_COMMAND_NAME:-sync-env}"

usage() {
  cat <<EOF
Usage: install-sync-env.sh [options]

Install the sync-env command into a local bin directory.

Options:
  --repo <owner/repo>    Source GitHub repository. Default: $REPO
  --ref <git-ref>        Branch, tag, or commit to install from. Default: $REF
  --bin-dir <path>       Install directory. Default: $BIN_DIR
  --name <command>       Installed command name. Default: $COMMAND_NAME
  -h, --help             Show this help message

Examples:
  bash install-sync-env.sh --repo your-org/dev-tools
  bash install-sync-env.sh --repo your-org/dev-tools --ref v1.0.0
EOF
}

decode_base64() {
  if base64 --decode >/dev/null 2>&1 <<<""; then
    base64 --decode
    return
  fi

  if base64 -d >/dev/null 2>&1 <<<""; then
    base64 -d
    return
  fi

  if base64 -D >/dev/null 2>&1 <<<""; then
    base64 -D
    return
  fi

  echo "No compatible base64 decoder found." >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --ref)
      REF="${2:-}"
      shift 2
      ;;
    --bin-dir)
      BIN_DIR="${2:-}"
      shift 2
      ;;
    --name)
      COMMAND_NAME="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$REPO" || "$REPO" == "your-org/dev-tools" ]]; then
  echo "Set a real repository with --repo <owner/repo> or SYNC_ENV_REPO." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
TARGET_PATH="$BIN_DIR/$COMMAND_NAME"
API_PATH="repos/$REPO/contents/scripts/sync-env?ref=$REF"

gh api "$API_PATH" --jq '.content' | tr -d '\n' | decode_base64 > "$TARGET_PATH"
chmod +x "$TARGET_PATH"

echo "Installed $COMMAND_NAME to $TARGET_PATH"

case ":$PATH:" in
  *":$BIN_DIR:"*)
    ;;
  *)
    echo
    echo "Add the following to your shell profile if needed:"
    echo "export PATH=\"$BIN_DIR:\$PATH\""
    ;;
esac

echo
echo "Run '$COMMAND_NAME --help' to verify the installation."
