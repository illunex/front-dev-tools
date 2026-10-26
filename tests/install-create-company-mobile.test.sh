#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

BIN_DIR="$TMP_DIR/bin"
SHARE_DIR="$TMP_DIR/share"
FAKE_HOME="$TMP_DIR/home"

fail() {
  echo "$1" >&2
  exit 1
}

assert_file() {
  [[ -f "$1" ]] || fail "Expected file to exist: $1"
}

assert_contains() {
  grep -Fq -e "$2" "$1" || fail "Expected $1 to contain: $2"
}

HOME="$FAKE_HOME" CREATE_MOBILE_BIN_DIR="$BIN_DIR" CREATE_MOBILE_SHARE_DIR="$SHARE_DIR" \
  bash "$ROOT_DIR/install/install-create-company-mobile.sh" --source-dir "$ROOT_DIR" >/dev/null

# CLI와 템플릿이 레포와 같은 상대 경로로 설치된다.
assert_file "$SHARE_DIR/scripts/create-company-mobile.mjs"
assert_file "$SHARE_DIR/templates/create-company-mobile/eas.json"
assert_file "$SHARE_DIR/templates/create-company-mobile/.eas/workflows/release.yml"
[[ -x "$BIN_DIR/create-company-mobile" ]] || fail "Expected executable shim: $BIN_DIR/create-company-mobile"

# shim으로 CLI가 실행된다.
help_output="$("$BIN_DIR/create-company-mobile" --help)"
[[ "$help_output" == *"--bundle-id"* ]] || fail "Expected --help output to mention --bundle-id"

# 다시 설치해도 이전 템플릿 파일이 남지 않는다.
touch "$SHARE_DIR/templates/create-company-mobile/stale-file.ts"
HOME="$FAKE_HOME" CREATE_MOBILE_BIN_DIR="$BIN_DIR" CREATE_MOBILE_SHARE_DIR="$SHARE_DIR" \
  bash "$ROOT_DIR/install/install-create-company-mobile.sh" --source-dir "$ROOT_DIR" >/dev/null
[[ ! -e "$SHARE_DIR/templates/create-company-mobile/stale-file.ts" ]] || fail "Expected reinstall to replace templates"

# Claude Code·Codex skill이 모두 설치된다.
for skill in "$FAKE_HOME/.claude/skills/create-company-mobile/SKILL.md" "$FAKE_HOME/.codex/skills/create-company-mobile/SKILL.md"; do
  assert_file "$skill"
  assert_contains "$skill" "name: create-company-mobile"
  assert_contains "$skill" "iPad 스크린샷"
  assert_contains "$skill" "--tablet"
  assert_contains "$skill" ".env"
  assert_contains "$skill" "illunex"
  assert_contains "$skill" "체크리스트"
done

echo "install-create-company-mobile tests passed"
