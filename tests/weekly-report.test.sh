#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v ruby >/dev/null 2>&1; then
  ruby -E UTF-8:UTF-8 -e 'require "psych"; text = File.read(ARGV.fetch(0), encoding: "UTF-8"); yaml = text.split(/^---\s*$/, 3).fetch(1); Psych.safe_load(yaml)' "$ROOT_DIR/skills/weekly-report/SKILL.md"
fi

assert_skill_rule() {
  local needle="$1"
  if ! grep -Fq -e "$needle" "$ROOT_DIR/skills/weekly-report/SKILL.md"; then
    echo "Expected skill rule to contain: $needle" >&2
    exit 1
  fi
}

# 계층형 출력 포맷
assert_skill_rule '[프로젝트 타이틀]'
assert_skill_rule '- 큰 업무명 ~M/D nn%'
assert_skill_rule '  ◦ 중간 업무명 nn%'
assert_skill_rule '    : 상세 내용 nn%'
assert_skill_rule '1단계 `[프로젝트 타이틀]`: 레포 이름이 아니라 HTML head 타이틀'
assert_skill_rule '**진행률(`nn%`)은 큰·중간·상세 세 단계 모든 줄에 표시한다.**'
assert_skill_rule '**날짜(`~M/D`)는 큰 업무 줄에만 표시한다.**'
assert_skill_rule '날짜는 항목 상태에 따른 완료일·예상 종료일·작업일 중 하나를 반드시 표시하며 생략하지 않음'

# 계정 간 표기 일관성
assert_skill_rule '프로젝트명은 CLI가 조회한 HTML head 타이틀을 그대로 쓰고'
assert_skill_rule '큰 업무는 아래 고정 어휘 7종 밖으로 나가지 않습니다.'
assert_skill_rule '중간 업무의 묶음 단위는 CLI `영역:` 값입니다.'
assert_skill_rule '확인할 수 없는 작업을 지어내지 않습니다.'

# 큰 업무 고정 어휘 7종과 분류 순서
assert_skill_rule '| `퍼블리싱` |'
assert_skill_rule '| `API 연결` |'
assert_skill_rule '| `기능개발` |'
assert_skill_rule '| `버그 수정` |'
assert_skill_rule '| `리팩토링/구조 개선` |'
assert_skill_rule '| `배포/환경 설정` |'
assert_skill_rule '| `변경 반영` |'
assert_skill_rule '처음 걸리는 항목에서 확정'
assert_skill_rule '`신호:`에 `API 연결` 포함되고 **새 엔드포인트를 처음 연결하는 작업**일 때만 → `API 연결`'
assert_skill_rule '**`API 연결`은 신규 연동일 때만 씁니다.**'
assert_skill_rule '`OO API 연결 및 OO 기능 구현`처럼'
assert_skill_rule '같은 프로젝트 안에서 같은 큰 업무는 하나의 줄로 합칩니다.'
assert_skill_rule '커밋 접두사가 `style:`이거나'
assert_skill_rule '신호가 없다는 이유로 퍼블리싱 작업을 `기능개발`에 묻지 않습니다.'
assert_skill_rule '`test:` 커밋은 단독 큰 업무로 만들지 않고'

# 중간·상세 업무
assert_skill_rule '형식: `<화면 타이틀> 페이지`'
assert_skill_rule '같은 영역의 커밋은 같은 중간 업무로 모읍니다.'
assert_skill_rule '`공통 컴포넌트`, `공통 스타일`, `공통 API 모듈`'
assert_skill_rule '한 화면의 부분 영역은 별도 중간 업무로 만들지 않고 그 화면의 중간 업무로 합칩니다.'
assert_skill_rule '`<대상> 모듈`로 씁니다.'
assert_skill_rule '커밋 하나를 그대로 한 줄로 옮기지 않습니다.'
assert_skill_rule '한 중간 업무당 상세는 2~5줄을 기준으로 합니다.'
assert_skill_rule '상세가 한 줄뿐이면 상세 줄을 만들지 않고 중간 업무명에 합칩니다.'

# CLI 수집 결과 해석
assert_skill_rule 'CLI 출력은 최종 보고서가 아니라 **수집 결과**입니다.'

# 여러 사람 완료 목록 직접 입력 (CLI 없는 팀 취합 경로)
assert_skill_rule '### 대안: 여러 사람의 완료 목록을 직접 받은 경우'
assert_skill_rule '**날짜·진행률은 사용자가 이미 확정한 값을 그대로 씁니다.**'
assert_skill_rule '**사람별로 별도 행·블록을 유지**합니다. 사람을 합쳐서 요약하지 않습니다.'
assert_skill_rule 'Step 13 표로 출력할 때 이 사람 구분이 그대로 "담당자" 열이 됩니다.'
assert_skill_rule '변경 파일 조회는 기본으로 켜 둡니다.'

# 진행률
assert_skill_rule '반드시 10% 단위로 표시하고, 1% 단위의 정밀한 수치는 사용하지 않습니다.'
assert_skill_rule '미착수 항목은 `0%`로 표시'
assert_skill_rule '전주 진행률을 시작값으로 사용하고, 금주 근거로 확인된 변화만 반영합니다.'
assert_skill_rule '진행률은 **상세 업무부터 아래에서 위로** 판정합니다.'
assert_skill_rule '하위 상세 업무 진행률의 평균을 10% 단위로 **내림**한 값입니다.'
assert_skill_rule '하위 중간 업무 진행률의 평균을 10% 단위로 **내림**한 값입니다.'
assert_skill_rule '완료 여부가 애매하면 `100%`가 아니라 `90%`를 기본값으로 씁니다.'
assert_skill_rule '커밋이 merge됐다는 사실만으로 `100%`를 주지 않습니다.'
assert_skill_rule '**보고 가치가 없는 사소한 변경은 상세 업무로 올리지 않고 생략합니다.**'
assert_skill_rule '사소한 변경만으로 구성된 중간 업무나 큰 업무는 줄 자체를 만들지 않습니다.'
assert_skill_rule '**남은 범위를 차주 주간보고 항목으로 내려 적습니다.**'
assert_skill_rule '차주 항목의 중간·상세 업무명은 금주와 같은 이름을 씁니다.'

# 날짜·정렬
assert_skill_rule '그 아래 모든 상세 업무 중 **가장 마지막 관련 작업일**을 사용합니다.'
assert_skill_rule '완료된 이월 항목의 전주 예상 종료일은 실제 완료일로 반드시 교체'
assert_skill_rule '`100%` 미만 이월 항목은 전주 예상 종료일을 유지'
assert_skill_rule '`100%` 미만 항목은 모두 맨 아래로 이동'
assert_skill_rule '완료 항목 그룹과 미완료 항목 그룹 내부에서는 각각 `~M/D` 날짜 오름차순으로 정렬'
assert_skill_rule '날짜까지 같으면 고정 어휘 순서'

# 전주 계획 이관·검증
assert_skill_rule '전주 계획의 모든 항목을 금주 보고의 기준 목록에 먼저 넣습니다.'
assert_skill_rule '금주 커밋이 없다는 이유로 항목을 제외하지 않습니다.'
assert_skill_rule '전주 업무명 자체는 버리지 않고'
assert_skill_rule '전주 계획의 모든 항목이 금주 보고에 포함됐는지 확인합니다.'
assert_skill_rule '들여쓰기가 큰 업무 0칸, 중간 업무 2칸 `◦ `, 상세 업무 4칸 `: `인지 확인합니다.'
assert_skill_rule '상위 항목 진행률이 하위 항목 평균의 10% 단위 내림값과 일치하는지 확인합니다.'
assert_skill_rule '`100%` 미만 상세·중간 업무의 남은 범위가 차주 주간보고 항목으로 내려갔는지 확인합니다.'
assert_skill_rule '계획 없이 새로 발견한 항목의 날짜가 없으면 CLI 원본에서 가장 마지막 작업일을 복원합니다.'
assert_skill_rule '완료일을 예상 종료일이나 보고 생성일로 대체하지 않습니다.'
assert_skill_rule '`100%` 미만 항목이 완료 항목보다 아래에 있는지 확인합니다.'
assert_skill_rule ': 테마 전환 최종 검증 및 잔여 이슈 정리'
assert_skill_rule '전주 예상 종료일 `8/31`은 완료 목표일일 뿐 실제 완료일이 아니므로'

# 차주 주간보고
assert_skill_rule '`100%` 미만 항목이 하나라도 있으면 차주 주간보고도 반드시 함께 제공합니다.'
assert_skill_rule '한 항목당 하나의 질문을 제공합니다.'
assert_skill_rule 'Claude Code·Cursor·Codex'
assert_skill_rule '`[프로젝트 타이틀] 큰 업무명` 형태로 적어'
assert_skill_rule '`[미완료 판단 근거]`를 추가하고'
assert_skill_rule '`기획 대기`, `디자인 대기`, `API 대기`'
assert_skill_rule '전주 대비 증가 폭이 `0~10%p`이거나 진행률이 감소한 항목'
assert_skill_rule '`기획 변경`, `API 변경`, `디자인 변경`'
assert_skill_rule '기능개발(API 대기중)'
assert_skill_rule 'API 연결(기획 변경 반영)'
assert_skill_rule '`100%` 미만 항목만 추려 스킬 실행일과 기존 예상 종료일을 비교합니다.'
assert_skill_rule '기존 예상 종료일이 실행일보다 미래인 항목은 질문 없이 기존 날짜로 차주 보고에 이월합니다.'
assert_skill_rule '기존 예상 종료일이 실행일과 같거나 과거이거나 날짜가 없는 항목만 질문 대상'
assert_skill_rule '실제 스킬 실행 날짜를 사용합니다.'
assert_skill_rule '기존 종료일 8/31을 유지하고 종료일·미착수·변동 사유를 모두 질문하지 않음'
assert_skill_rule '필요한 예상 종료일 답변을 받기 전에는 차주 주간보고를 확정하거나 날짜 없는 차주 항목을 출력하지 않습니다.'
assert_skill_rule '누락된 질문 대상 항목의 종료일만 다시 질문합니다.'
assert_skill_rule '기존 미래 종료일 또는 사용자가 새로 입력한 예상 종료일'

# 연계 항목·이슈사항
assert_skill_rule '## Step 11: 연계 항목 정리'
assert_skill_rule '**따로 보면 놓치는 연결을 한자리에 모읍니다.**'
assert_skill_rule '**레포를 가로지르는 연결**'
assert_skill_rule '연결의 방향은 `→`로 표시합니다.'
assert_skill_rule '연결이 하나도 확인되지 않으면 `[연계 항목]` 섹션을 만들지 않습니다.'
assert_skill_rule '## Step 12: 이슈사항 정리'
assert_skill_rule '같은 화면·영역에 한 주 안에서 수정이 반복된 흔적'
assert_skill_rule '외부 릴리스·타 팀 응답·기획 확정 등 내 작업 밖의 대기 요인'
assert_skill_rule '확인된 이슈가 없으면 `[이슈사항]` 아래 `- 확인된 이슈 없음` 한 줄을 적습니다.'

# HTML 표 산출물
assert_skill_rule '"주간보고 표로 만들어줘" / "주간보고 테이블 만들어줘" / "주간보고 html로" → Step 13의 HTML 표 산출물로 응답'
assert_skill_rule '## Step 13: HTML 표 산출물'
assert_skill_rule 'skills/weekly-report/assets/report-table-template.html'
assert_skill_rule '**프로젝트 기준으로 행을 병합**한다. 담당자 기준으로 묶지 않는다'
assert_skill_rule '**계층이 깊어질수록 강조를 약하게**'
assert_skill_rule '| 대분류(큰 업무) | 배경색 뱃지 |'
assert_skill_rule '| 중분류(중간 업무) | 굵은 글씨, 배경 없음 |'
assert_skill_rule '| 소분류(상세 업무) | 일반 글씨 |'
assert_skill_rule '**`<table>` 안쪽 모든 요소는 인라인 스타일만 씁니다.**'
assert_skill_rule '`::before` 같은 가상요소를 쓰지 않습니다.'
assert_skill_rule '**표 내부 인라인 스타일에는 `font-family`를 넣지 않습니다.**'
assert_skill_rule '| 이슈사항 | 5열. Step 12 기준(운영 장애, 반복 수정, 보안·의존성 경고, 임시 대응, 외부 대기 요인)에 해당하는 문장만 불릿으로 나열. 없으면 `확인된 이슈 없음` |'
assert_skill_rule '이슈사항은 계층 없이 문장 단위 불릿으로만 적습니다.'

if [[ ! -f "$ROOT_DIR/skills/weekly-report/assets/report-table-template.html" ]]; then
  echo "Expected table template asset to exist" >&2
  exit 1
fi

for needle in 'const PERIOD' 'const DATA' 'const PROJECT_ORDER' 'id="report-table"' 'pctBadgeOk' 'pctBoldOk' 'pctPlainOk' '이슈사항' 'function issuesCell' '확인된 이슈 없음'; do
  if ! grep -Fq -e "$needle" "$ROOT_DIR/skills/weekly-report/assets/report-table-template.html"; then
    echo "Expected table template to contain: $needle" >&2
    exit 1
  fi
done

# 표 내부는 클래스가 아니라 인라인 스타일만 사용해야 한다
if sed -n '/<tbody id="rows">/,/<\/table>/p' "$ROOT_DIR/skills/weekly-report/assets/report-table-template.html" | grep -q 'class='; then
  echo "Table body markup must not use class attributes" >&2
  exit 1
fi

# font-family를 인라인 style="" 값에 넣으면 따옴표 충돌로 뒤따르는 인라인 스타일이 전부 깨진다.
# 템플릿 전체(페이지 CSS 포함)에 실제 font-family 선언(콜론 포함)이 남아 있으면 안 된다.
# (설명 주석에서 "font-family"라는 단어 자체를 언급하는 것은 허용한다.)
if grep -q 'font-family:' "$ROOT_DIR/skills/weekly-report/assets/report-table-template.html"; then
  echo "Table template must not declare font-family anywhere" >&2
  exit 1
fi


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

# 프로젝트 타이틀 캐시가 사용자 홈으로 새지 않도록 격리한다.
export XDG_CACHE_HOME="$TEST_TMP/cache"

REAL_JQ="$(command -v jq || true)"

BIN_DIR="$TEST_TMP/bin"
mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/gh" <<'STUB'
#!/bin/bash
set -euo pipefail

if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi

if [[ "$1" == "api" ]]; then
  shift
  target=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -H)
        shift 2
        ;;
      --jq)
        shift 2
        ;;
      *)
        target="$1"
        shift
        ;;
    esac
  done

  case "$target" in
    user)
      echo "octocat"
      exit 0
      ;;
    repos/*/contents/index.html)
      cat <<'HTML'
<!doctype html>
<html lang="ko">
  <head>
    <title>Stock Link</title>
  </head>
  <body></body>
</html>
HTML
      exit 0
      ;;
    repos/*/contents/*)
      exit 1
      ;;
    repos/*/commits/*)
      echo '["src/pages/stock/detail/Chart.tsx","src/pages/stock/detail/Chart.module.scss"]'
      exit 0
      ;;
  esac

  echo "unexpected gh api call: $target" >&2
  exit 1
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

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "Expected output NOT to contain: $needle" >&2
    echo "Actual output:" >&2
    echo "$haystack" >&2
    exit 1
  fi
}

assert_report_items_have_dates() {
  local report="$1"
  local invalid_items

  invalid_items="$(printf '%s\n' "$report" | awk '/^- / && $0 !~ / ~[0-9]+\/[0-9]+$/')"
  if [[ -n "$invalid_items" ]]; then
    echo "Expected every collected item to end with ~M/D:" >&2
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
  report_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --from 2026-04-20 --to 2026-04-26 2>/dev/null)"

  # HTML head 타이틀을 프로젝트명으로 쓰고 레포 경로는 괄호로만 남긴다.
  assert_contains "$report_output" "[Stock Link] (illunex/my-project)"
  assert_not_contains "$report_output" "[illunex/my-project]"

  assert_contains "$report_output" "- feat: 직접 커밋 추가 ~4/21"
  assert_contains "$report_output" "- feat: PR 포함 커밋 추가 ~4/22"
  assert_contains "$report_output" "- fix: PR 포함 버그 수정 ~4/22"
  assert_report_items_have_dates "$report_output"

  # 중간·상세 업무 판단 근거가 항목마다 붙어야 한다.
  assert_contains "$report_output" "  영역: stock/detail"
  assert_contains "$report_output" "  신호: "
  assert_contains "$report_output" "퍼블리싱"
  assert_contains "$report_output" "  파일: src/pages/stock/detail/Chart.module.scss, src/pages/stock/detail/Chart.tsx"

  # 진행률은 CLI가 아니라 스킬이 판정한다.
  assert_not_contains "$report_output" "100%"

  # 파일이 상한을 넘으면 경로를 디렉터리로 접어 출력 길이를 줄인다.
  collapsed_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --from 2026-04-20 --to 2026-04-26 --files-cap 1 2>/dev/null)"
  assert_contains "$collapsed_output" "  파일: src/pages/stock/detail 등 2개 파일"
  assert_not_contains "$collapsed_output" "Chart.module.scss"

  no_files_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --from 2026-04-20 --to 2026-04-26 --no-files 2>/dev/null)"
  assert_contains "$no_files_output" "[Stock Link] (illunex/my-project)"
  assert_not_contains "$no_files_output" "  파일: "
  assert_not_contains "$no_files_output" "  영역: "
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
