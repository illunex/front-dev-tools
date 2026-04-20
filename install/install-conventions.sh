#!/bin/bash
set -euo pipefail

SOURCE_REPO="${CONVENTIONS_INSTALL_REPO:-illunex/front-dev-tools}"
REF="${CONVENTIONS_REF:-main}"

INSTALL_CLAUDE=false
INSTALL_CODEX=false
INSTALL_CURSOR=false
INSTALL_ALL=true
DRY_RUN=false
FORCE=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[conventions]${NC} $*"; }
success() { echo -e "${GREEN}[conventions]${NC} $*"; }
warn()    { echo -e "${YELLOW}[conventions]${NC} $*"; }
error()   { echo -e "${RED}[conventions]${NC} $*" >&2; }

usage() {
  cat <<EOF
Usage: install-conventions.sh [options]

회사 공통 개발 컨벤션 파일을 각 AI 툴의 글로벌 설정 디렉토리에 설치합니다.

대상 파일:
  ~/.claude/CLAUDE.md          (Claude Code)
  ~/.codex/AGENTS.md           (Codex)
  ~/.cursor/rules/company.mdc  (Cursor)

Options:
  --claude           Claude Code용 파일만 설치
  --codex            Codex용 파일만 설치
  --cursor           Cursor용 파일만 설치
  --repo <owner/repo>  소스 GitHub 레포지토리. 기본값: $SOURCE_REPO
  --ref <git-ref>    설치할 브랜치·태그·커밋. 기본값: $REF
  --dry-run          실제 설치 없이 어떤 파일이 어디에 설치되는지 출력만
  --force            기존 파일 확인 없이 백업 후 자동 덮어쓰기
  -h, --help         이 도움말 출력

Examples:
  bash install-conventions.sh
  bash install-conventions.sh --claude
  bash install-conventions.sh --ref v1.0.0
  bash install-conventions.sh --dry-run
  bash install-conventions.sh --force
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --claude)  INSTALL_CLAUDE=true; INSTALL_ALL=false; shift ;;
    --codex)   INSTALL_CODEX=true;  INSTALL_ALL=false; shift ;;
    --cursor)  INSTALL_CURSOR=true; INSTALL_ALL=false; shift ;;
    --repo)    SOURCE_REPO="${2:-}"; shift 2 ;;
    --ref)     REF="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --force)   FORCE=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) error "알 수 없는 옵션: $1"; usage >&2; exit 1 ;;
  esac
done

if [[ "$INSTALL_ALL" == "true" ]]; then
  INSTALL_CLAUDE=true
  INSTALL_CODEX=true
  INSTALL_CURSOR=true
fi

if [[ -z "$SOURCE_REPO" ]]; then
  error "소스 레포지토리가 필요합니다."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  error "curl이 필요합니다."
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BASE_URL="https://raw.githubusercontent.com/$SOURCE_REPO/$REF"

install_file() {
  local src_path="$1"
  local dest_path="$2"
  local dest_dir
  dest_dir="$(dirname "$dest_path")"
  local raw_url="$BASE_URL/$src_path"

  if [[ "$DRY_RUN" == "true" ]]; then
    info "[dry-run] $raw_url → $dest_path"
    return
  fi

  mkdir -p "$dest_dir"

  if [[ -f "$dest_path" ]]; then
    if [[ "$FORCE" == "true" ]]; then
      mv "$dest_path" "${dest_path}.bak.${TIMESTAMP}"
      warn "기존 파일 백업: ${dest_path}.bak.${TIMESTAMP}"
    else
      echo
      warn "이미 존재하는 파일: $dest_path"
      read -r -p "덮어쓰겠습니까? 기존 파일은 백업됩니다. [y/N] " answer
      case "$answer" in
        [yY]|[yY][eE][sS])
          mv "$dest_path" "${dest_path}.bak.${TIMESTAMP}"
          warn "기존 파일 백업: ${dest_path}.bak.${TIMESTAMP}"
          ;;
        *)
          info "건너뜀: $dest_path"
          return
          ;;
      esac
    fi
  fi

  curl -fsSL "$raw_url" -o "$dest_path"
  success "설치 완료: $dest_path"
}

echo
info "회사 공통 개발 컨벤션 설치 시작"
info "소스: https://github.com/$SOURCE_REPO (ref: $REF)"
[[ "$DRY_RUN" == "true" ]] && warn "[dry-run 모드] 실제 파일은 변경되지 않습니다."
echo

if [[ "$INSTALL_CLAUDE" == "true" ]]; then
  install_file "conventions/claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
fi

if [[ "$INSTALL_CODEX" == "true" ]]; then
  install_file "conventions/codex/AGENTS.md" "$HOME/.codex/AGENTS.md"
fi

if [[ "$INSTALL_CURSOR" == "true" ]]; then
  install_file "conventions/cursor/company.mdc" "$HOME/.cursor/rules/company.mdc"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo
  info "dry-run 완료. 실제 설치하려면 --dry-run 옵션을 빼고 실행하세요."
  exit 0
fi

echo
success "설치 완료!"
echo

if [[ "$INSTALL_CLAUDE" == "true" ]]; then
  info "Claude Code: 다음 세션부터 자동으로 컨벤션이 로드됩니다."
fi
if [[ "$INSTALL_CODEX" == "true" ]]; then
  info "Codex: 다음 세션부터 자동으로 컨벤션이 로드됩니다."
fi
if [[ "$INSTALL_CURSOR" == "true" ]]; then
  info "Cursor: Cursor를 재시작하면 컨벤션 룰이 활성화됩니다."
  info "  → Cursor Settings > Rules > User Rules 에서도 확인하세요."
fi

echo
info "컨벤션 파일의 TODO 항목을 직접 채워 팀에 맞게 커스터마이즈하세요."
info "  원본: conventions/shared/conventions.md"
