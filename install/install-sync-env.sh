#!/bin/bash
set -euo pipefail

SOURCE_REPO="${SYNC_ENV_INSTALL_REPO:-illunex/front-dev-tools}"
REF="${SYNC_ENV_REF:-main}"
BIN_DIR="${SYNC_ENV_BIN_DIR:-$HOME/.local/bin}"
COMMAND_NAME="${SYNC_ENV_COMMAND_NAME:-sync-env}"

usage() {
  cat <<EOF
Usage: install-sync-env.sh [options]

Install the sync-env command into a local bin directory.

Options:
  --repo <owner/repo>    Source GitHub repository. Default: $SOURCE_REPO
  --ref <git-ref>        Branch, tag, or commit to install from. Default: $REF
  --bin-dir <path>       Install directory. Default: $BIN_DIR
  --name <command>       Installed command name. Default: $COMMAND_NAME
  -h, --help             Show this help message

Examples:
  bash install-sync-env.sh
  bash install-sync-env.sh --ref v1.0.0
  bash install-sync-env.sh --repo your-org/dev-tools
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      SOURCE_REPO="${2:-}"
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

if [[ -z "$SOURCE_REPO" ]]; then
  echo "Source repository is required." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

mkdir -p "$BIN_DIR"
TARGET_PATH="$BIN_DIR/$COMMAND_NAME"
RAW_URL="https://raw.githubusercontent.com/$SOURCE_REPO/$REF/scripts/sync-env.sh"

curl -fsSL "$RAW_URL" -o "$TARGET_PATH"
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
echo "Pass the target GitHub repository later with '$COMMAND_NAME --repo <owner/repo>'."
