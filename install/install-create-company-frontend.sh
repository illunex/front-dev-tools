#!/bin/bash
set -euo pipefail

SOURCE_REPO="${CREATE_FRONTEND_INSTALL_REPO:-illunex/front-dev-tools}"
REF="${CREATE_FRONTEND_REF:-main}"
BIN_DIR="${CREATE_FRONTEND_BIN_DIR:-$HOME/.local/bin}"
COMMAND_NAME="${CREATE_FRONTEND_COMMAND_NAME:-create-company-frontend}"
INSTALL_CLAUDE=false
INSTALL_CODEX=false
INSTALL_ALL=true

usage() {
  cat <<EOF
Usage: install-create-company-frontend.sh [options]

Install the create-company-frontend command and AI skills.

Options:
  --claude              Install Claude Code skill only
  --codex               Install Codex skill only
  --repo <owner/repo>   Source GitHub repository. Default: $SOURCE_REPO
  --ref <git-ref>       Branch, tag, or commit to install from. Default: $REF
  --bin-dir <path>      Install directory. Default: $BIN_DIR
  --name <command>      Installed command name. Default: $COMMAND_NAME
  --no-skills           Install command only
  -h, --help            Show this help message

Examples:
  bash install-create-company-frontend.sh
  bash install-create-company-frontend.sh --codex
  bash install-create-company-frontend.sh --ref v1.0.0
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --claude)
      INSTALL_CLAUDE=true
      INSTALL_ALL=false
      shift
      ;;
    --codex)
      INSTALL_CODEX=true
      INSTALL_ALL=false
      shift
      ;;
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
    --no-skills)
      INSTALL_ALL=false
      INSTALL_CLAUDE=false
      INSTALL_CODEX=false
      shift
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

if [[ "$INSTALL_ALL" == "true" ]]; then
  INSTALL_CLAUDE=true
  INSTALL_CODEX=true
fi

if [[ -z "$SOURCE_REPO" ]]; then
  echo "Source repository is required." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

BASE_URL="https://raw.githubusercontent.com/$SOURCE_REPO/$REF"

mkdir -p "$BIN_DIR"
TARGET_PATH="$BIN_DIR/$COMMAND_NAME"

curl -fsSL "$BASE_URL/scripts/create-company-frontend.mjs" -o "$TARGET_PATH"
chmod +x "$TARGET_PATH"

echo "Installed $COMMAND_NAME to $TARGET_PATH"

install_skill() {
  local target_dir="$1"
  mkdir -p "$target_dir"
  curl -fsSL "$BASE_URL/skills/create-company-frontend/SKILL.md" -o "$target_dir/SKILL.md"
  echo "Installed skill to $target_dir/SKILL.md"
}

if [[ "$INSTALL_CLAUDE" == "true" ]]; then
  install_skill "$HOME/.claude/skills/create-company-frontend"
fi

if [[ "$INSTALL_CODEX" == "true" ]]; then
  install_skill "$HOME/.codex/skills/create-company-frontend"
fi

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
