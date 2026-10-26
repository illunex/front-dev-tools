#!/bin/bash
set -euo pipefail

SOURCE_REPO="${CREATE_MOBILE_INSTALL_REPO:-illunex/front-dev-tools}"
REF="${CREATE_MOBILE_REF:-main}"
BIN_DIR="${CREATE_MOBILE_BIN_DIR:-$HOME/.local/bin}"
SHARE_DIR="${CREATE_MOBILE_SHARE_DIR:-$HOME/.local/share/create-company-mobile}"
COMMAND_NAME="${CREATE_MOBILE_COMMAND_NAME:-create-company-mobile}"
SOURCE_DIR=""
INSTALL_CLAUDE=false
INSTALL_CODEX=false
INSTALL_ALL=true

usage() {
  cat <<EOF
Usage: install-create-company-mobile.sh [options]

Install the create-company-mobile command, its templates, and AI skills.

Options:
  --claude              Install Claude Code skill only
  --codex               Install Codex skill only
  --repo <owner/repo>   Source GitHub repository. Default: $SOURCE_REPO
  --ref <git-ref>       Branch, tag, or commit to install from. Default: $REF
  --bin-dir <path>      Command install directory. Default: $BIN_DIR
  --share-dir <path>    CLI and template install directory. Default: $SHARE_DIR
  --name <command>      Installed command name. Default: $COMMAND_NAME
  --source-dir <path>   Install from a local front-dev-tools checkout instead of GitHub
  --no-skills           Install command only
  -h, --help            Show this help message

Examples:
  bash install-create-company-mobile.sh
  bash install-create-company-mobile.sh --codex
  bash install-create-company-mobile.sh --ref v1.0.0
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
    --share-dir)
      SHARE_DIR="${2:-}"
      shift 2
      ;;
    --name)
      COMMAND_NAME="${2:-}"
      shift 2
      ;;
    --source-dir)
      SOURCE_DIR="${2:-}"
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

if ! command -v node >/dev/null 2>&1; then
  echo "node is required." >&2
  exit 1
fi

# CLI는 여러 템플릿 파일을 함께 써야 하므로 파일 단위 raw 다운로드 대신 레포 tarball을 받아 푼다.
if [[ -z "$SOURCE_DIR" ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "curl is required." >&2
    exit 1
  fi

  DOWNLOAD_DIR="$(mktemp -d)"
  trap 'rm -rf "$DOWNLOAD_DIR"' EXIT
  curl -fsSL "https://codeload.github.com/$SOURCE_REPO/tar.gz/$REF" | tar -xz -C "$DOWNLOAD_DIR"
  SOURCE_DIR="$(find "$DOWNLOAD_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
fi

if [[ ! -f "$SOURCE_DIR/scripts/create-company-mobile.mjs" || ! -d "$SOURCE_DIR/templates/create-company-mobile" ]]; then
  echo "create-company-mobile source not found in: $SOURCE_DIR" >&2
  exit 1
fi

# CLI는 ../templates/create-company-mobile을 상대 경로로 찾으므로 레포와 같은 구조로 둔다.
# 지난 설치의 템플릿 파일이 남지 않게 통째로 교체한다.
rm -rf "$SHARE_DIR/scripts" "$SHARE_DIR/templates"
mkdir -p "$SHARE_DIR/scripts" "$SHARE_DIR/templates"
cp "$SOURCE_DIR/scripts/create-company-mobile.mjs" "$SHARE_DIR/scripts/"
cp -R "$SOURCE_DIR/templates/create-company-mobile" "$SHARE_DIR/templates/"
echo "Installed CLI and templates to $SHARE_DIR"

mkdir -p "$BIN_DIR"
TARGET_PATH="$BIN_DIR/$COMMAND_NAME"
cat > "$TARGET_PATH" <<EOF
#!/bin/bash
exec node "$SHARE_DIR/scripts/create-company-mobile.mjs" "\$@"
EOF
chmod +x "$TARGET_PATH"
echo "Installed $COMMAND_NAME to $TARGET_PATH"

install_skill() {
  local target_dir="$1"
  mkdir -p "$target_dir"
  cp "$SOURCE_DIR/skills/create-company-mobile/SKILL.md" "$target_dir/SKILL.md"
  echo "Installed skill to $target_dir/SKILL.md"
}

if [[ "$INSTALL_CLAUDE" == "true" ]]; then
  install_skill "$HOME/.claude/skills/create-company-mobile"
fi

if [[ "$INSTALL_CODEX" == "true" ]]; then
  install_skill "$HOME/.codex/skills/create-company-mobile"
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
