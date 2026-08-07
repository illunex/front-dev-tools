#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v ruby >/dev/null 2>&1; then
  ruby -E UTF-8:UTF-8 -e 'require "psych"; text = File.read(ARGV.fetch(0), encoding: "UTF-8"); yaml = text.split(/^---\s*$/, 3).fetch(1); Psych.safe_load(yaml)' "$ROOT_DIR/skills/weekly-report/SKILL.md"
fi

assert_skill_rule() {
  local needle="$1"
  if ! grep -Fq "$needle" "$ROOT_DIR/skills/weekly-report/SKILL.md"; then
    echo "Expected skill rule to contain: $needle" >&2
    exit 1
  fi
}

assert_skill_rule '`100%` 미만 항목이 하나라도 있으면 차주 주간보고도 반드시 함께 제공합니다.'
assert_skill_rule '한 항목당 하나의 질문을 제공합니다.'
assert_skill_rule 'Claude Code·Cursor·Codex'
assert_skill_rule '반드시 10% 단위로 표시하고, 1% 단위의 정밀한 수치는 사용하지 않습니다.'
assert_skill_rule '`[미완료 판단 근거]`를 추가하고'
assert_skill_rule '미착수 항목은 `0%`로 표시'
assert_skill_rule '`기획 대기`, `디자인 대기`, `API 대기`'
assert_skill_rule '전주 대비 증가 폭이 `0~10%p`이거나 진행률이 감소한 항목'
assert_skill_rule '`기획 변경`, `API 변경`, `디자인 변경`'
assert_skill_rule '결제 내역 화면 개발(API 대기중)'
assert_skill_rule '정산 화면 개발(기획 변경 반영)'
assert_skill_rule '날짜는 항목 상태에 따른 완료일·예상 종료일·작업일 중 하나를 반드시 표시하며 생략하지 않음'
assert_skill_rule '계획 없이 새로 발견한 항목의 날짜가 없으면 CLI 원본에서 가장 마지막 작업일을 복원합니다.'
assert_skill_rule '완료일을 예상 종료일이나 보고 생성일로 대체하지 않습니다.'
assert_skill_rule '필요한 예상 종료일 답변을 받기 전에는 차주 주간보고를 확정하거나 날짜 없는 차주 항목을 출력하지 않습니다.'
assert_skill_rule '누락된 질문 대상 항목의 종료일만 다시 질문합니다.'
assert_skill_rule '전주 계획의 모든 항목을 금주 보고의 기준 목록에 먼저 넣습니다.'
assert_skill_rule '금주 커밋이 없다는 이유로 항목을 제외하지 않습니다.'
assert_skill_rule '전주 진행률을 시작값으로 사용하고, 금주 근거로 확인된 변화만 반영합니다.'
assert_skill_rule '완료된 이월 항목의 전주 예상 종료일은 실제 완료일로 반드시 교체'
assert_skill_rule '`100%` 미만 이월 항목은 전주 예상 종료일을 유지'
assert_skill_rule '전주 계획의 모든 항목이 금주 보고에 포함됐는지 확인합니다.'
assert_skill_rule '테마 전환 기능 최종 검증 ~8/7 100%'
assert_skill_rule '전주 예상 종료일 `8/31`은 완료 목표일일 뿐 실제 완료일이 아니므로'
assert_skill_rule '`100%` 미만 항목은 모두 맨 아래로 이동'
assert_skill_rule '완료 항목 그룹과 미완료 항목 그룹 내부에서는 각각 `~M/D` 날짜 오름차순으로 정렬'
assert_skill_rule '같은 날짜의 이월 항목은 전주 계획 순서를 유지'
assert_skill_rule '`100%` 미만 항목이 완료 항목보다 아래에 있는지 확인합니다.'
assert_skill_rule '`100%` 미만 항목만 추려 스킬 실행일과 기존 예상 종료일을 비교합니다.'
assert_skill_rule '기존 예상 종료일이 실행일보다 미래인 항목은 질문 없이 기존 날짜로 차주 보고에 이월합니다.'
assert_skill_rule '기존 예상 종료일이 실행일과 같거나 과거이거나 날짜가 없는 항목만 질문 대상'
assert_skill_rule '실제 스킬 실행 날짜를 사용합니다.'
assert_skill_rule '기존 종료일 8/31을 유지하고 종료일·미착수·변동 사유를 모두 질문하지 않음'
assert_skill_rule '기존 미래 종료일 또는 사용자가 새로 입력한 예상 종료일'

bash -n "$ROOT_DIR/install/install-weekly-report.sh"
installer_help="$(bash "$ROOT_DIR/install/install-weekly-report.sh" --help)"
if [[ "$installer_help" != *'--cursor'* ]]; then
  echo 'Expected installer help to include --cursor' >&2
  exit 1
fi

TEST_TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

REAL_JQ="$(command -v jq || true)"

BIN_DIR="$TEST_TMP/bin"
mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/gh" <<'STUB'
#!/bin/bash
set -euo pipefail

if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi

if [[ "$1" == "api" && "$2" == "user" ]]; then
  echo "octocat"
  exit 0
fi

if [[ "$1" == "search" && "$2" == "commits" ]]; then
  cat <<'JSON'
[
  {
    "repository": {"fullName": "illunex/my-project"},
    "commit": {
      "message": "feat: 직접 커밋 추가\n\nbody",
      "committer": {"date": "2026-04-21T03:00:00Z"}
    },
    "parents": [{"sha": "parent"}],
    "sha": "direct-sha"
  }
]
JSON
  exit 0
fi

if [[ "$1" == "search" && "$2" == "prs" ]]; then
  cat <<'JSON'
[
  {
    "repository": {"name": "my-project", "nameWithOwner": "illunex/my-project"},
    "number": 17,
    "closedAt": "2026-04-22T05:00:00Z"
  }
]
JSON
  exit 0
fi

if [[ "$1" == "pr" && "$2" == "view" ]]; then
  cat <<'JSON'
{
  "mergedAt": "2026-04-22T05:00:00Z",
  "commits": [
    {
      "oid": "pr-sha-1",
      "messageHeadline": "feat: PR 포함 커밋 추가",
      "committedDate": "2026-04-19T02:00:00Z"
    },
    {
      "oid": "pr-sha-2",
      "messageHeadline": "fix: PR 포함 버그 수정",
      "committedDate": "2026-04-20T02:00:00Z"
    }
  ]
}
JSON
  exit 0
fi

echo "unexpected gh call: $*" >&2
exit 1
STUB

if [[ -n "$REAL_JQ" ]]; then
  cat > "$BIN_DIR/jq" <<STUB
#!/bin/bash
exec "$REAL_JQ" "\$@"
STUB
else
  cat > "$BIN_DIR/jq" <<'STUB'
#!/bin/bash
exit 0
STUB
fi

cat > "$BIN_DIR/date" <<'STUB'
#!/bin/bash
set -euo pipefail

if [[ "${1:-}" == "-j" ]]; then
  echo "GNU date does not support -j" >&2
  exit 1
fi

if [[ "$*" == "+%Y-%m-%d" ]]; then
  echo "2026-04-22"
  exit 0
fi

if [[ "${1:-}" == "-d" ]]; then
  case "$2 $3" in
    "2026-04-22 +%u")
      echo "3"
      ;;
    "2026-04-15 +%u")
      echo "3"
      ;;
    "2026-04-22 - 2 days +%Y-%m-%d")
      echo "2026-04-20"
      ;;
    "2026-04-15 - 2 days +%Y-%m-%d")
      echo "2026-04-13"
      ;;
    "2026-04-20 + 6 days +%Y-%m-%d")
      echo "2026-04-26"
      ;;
    "2026-04-13 + 6 days +%Y-%m-%d")
      echo "2026-04-19"
      ;;
    "2026-04-22 - 1 weeks +%Y-%m-%d")
      echo "2026-04-15"
      ;;
    *)
      echo "unexpected date -d call: $*" >&2
      exit 1
      ;;
  esac
  exit 0
fi

echo "unexpected date call: $*" >&2
exit 1
STUB

chmod +x "$BIN_DIR/gh" "$BIN_DIR/jq" "$BIN_DIR/date"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "Expected output to contain: $needle" >&2
    echo "Actual output:" >&2
    echo "$haystack" >&2
    exit 1
  fi
}

assert_report_items_have_dates() {
  local report="$1"
  local invalid_items

  invalid_items="$(printf '%s\n' "$report" | awk '/^- / && $0 !~ / ~[0-9]+\/[0-9]+ [0-9]+%$/')"
  if [[ -n "$invalid_items" ]]; then
    echo "Expected every report item to include ~M/D and progress:" >&2
    echo "$invalid_items" >&2
    exit 1
  fi
}

output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --dry-run)"
assert_contains "$output" "Date range: 2026-04-20 .. 2026-04-26"
assert_contains "$output" "Author: octocat"
assert_contains "$output" "Command: gh search commits --author=octocat --committer-date=2026-04-20..2026-04-26 --sort=committer-date --order=asc --limit=200 --json repository,commit,parents,sha"
assert_contains "$output" "Command: gh search prs --author=octocat --merged --merged-at=2026-04-20..2026-04-26 --limit=200 --json repository,number,closedAt"

last_week_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --week 1 --dry-run)"
assert_contains "$last_week_output" "Date range: 2026-04-13 .. 2026-04-19"

if [[ -n "$REAL_JQ" ]]; then
  report_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --from 2026-04-20 --to 2026-04-26)"
  assert_contains "$report_output" "[illunex/my-project]"
  assert_contains "$report_output" "- feat: 직접 커밋 추가 ~4/21 100%"
  assert_contains "$report_output" "- feat: PR 포함 커밋 추가 ~4/22 100%"
  assert_contains "$report_output" "- fix: PR 포함 버그 수정 ~4/22 100%"
  assert_report_items_have_dates "$report_output"
fi

BSD_BIN_DIR="$TEST_TMP/bsd-bin"
mkdir -p "$BSD_BIN_DIR"
cp "$BIN_DIR/gh" "$BSD_BIN_DIR/gh"
cp "$BIN_DIR/jq" "$BSD_BIN_DIR/jq"

cat > "$BSD_BIN_DIR/date" <<'STUB'
#!/bin/bash
set -euo pipefail

case "$*" in
  "+%Y-%m-%d")
    echo "2026-04-22"
    ;;
  "-j -f %Y-%m-%d 2026-04-22 +%u")
    echo "3"
    ;;
  "-j -v-2d -f %Y-%m-%d 2026-04-22 +%Y-%m-%d")
    echo "2026-04-20"
    ;;
  "-j -v+6d -f %Y-%m-%d 2026-04-20 +%Y-%m-%d")
    echo "2026-04-26"
    ;;
  *)
    echo "unexpected BSD date call: $*" >&2
    exit 1
    ;;
esac
STUB

chmod +x "$BSD_BIN_DIR/date"

bsd_output="$(PATH="$BSD_BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --dry-run)"
assert_contains "$bsd_output" "Date range: 2026-04-20 .. 2026-04-26"
