#!/bin/bash
set -euo pipefail

WEEK_OFFSET=0
FROM_DATE=""
TO_DATE=""
AUTHOR="@me"
LIMIT=200
DRY_RUN=false
FETCH_FILES=true
REFRESH_TITLES=false
FILE_CAP=8

usage() {
  cat <<'EOF'
Usage: weekly-report [options]

Collect your GitHub commits and merged PR commits for a week, grouped by project title.

Output is an intermediate collection result. The AI skill turns it into the
hierarchical weekly report (큰 업무 / 중간 업무 / 상세 업무).

Options:
  -w, --week <n>           Weeks ago (0 = this week, 1 = last week). Default: 0
      --from <YYYY-MM-DD>  Start date inclusive. Overrides --week.
      --to   <YYYY-MM-DD>  End date inclusive. Overrides --week.
      --author <login>     GitHub login. Default: @me (authenticated user)
  -L, --limit <n>          Max commits and merged PRs to fetch per query. Default: 200
      --no-files           Skip per-commit changed-file lookup (faster, less accurate)
      --files-cap <n>      Max file paths printed per item; above it, paths collapse to directories. Default: 8
      --refresh-titles     Ignore cached project titles and look them up again
      --dry-run            Print date range and gh command, then exit
  -h, --help               Show this help

Examples:
  weekly-report
  weekly-report --week 1
  weekly-report --from 2026-04-13 --to 2026-04-19
  weekly-report --author octocat
  weekly-report --no-files
EOF
}

date_week_offset() {
  local d="$1"
  local weeks="$2"

  if date -j -v-"${weeks}"w -f "%Y-%m-%d" "$d" +"%Y-%m-%d" >/dev/null 2>&1; then
    date -j -v-"${weeks}"w -f "%Y-%m-%d" "$d" +"%Y-%m-%d"
    return
  fi

  date -d "$d - $weeks weeks" +"%Y-%m-%d"
}

date_day_offset() {
  local d="$1"
  local days="$2"
  local bsd_days="$days"

  if [[ "$bsd_days" != -* && "$bsd_days" != +* ]]; then
    bsd_days="+$bsd_days"
  fi

  if date -j -v"${bsd_days}"d -f "%Y-%m-%d" "$d" +"%Y-%m-%d" >/dev/null 2>&1; then
    date -j -v"${bsd_days}"d -f "%Y-%m-%d" "$d" +"%Y-%m-%d"
    return
  fi

  if [[ "$days" == -* ]]; then
    date -d "$d - ${days#-} days" +"%Y-%m-%d"
  else
    date -d "$d + $days days" +"%Y-%m-%d"
  fi
}

# Get ISO week Monday for a given YYYY-MM-DD. Supports macOS BSD date and GNU date.
iso_monday() {
  local d="$1"
  local dow
  if ! dow=$(date -j -f "%Y-%m-%d" "$d" +"%u" 2>/dev/null); then
    dow=$(date -d "$d" +"%u")
  fi
  local back=$(( dow - 1 ))
  if [[ $back -eq 0 ]]; then
    echo "$d"
  else
    date_day_offset "$d" "-$back"
  fi
}

iso_sunday() {
  date_day_offset "$1" "6"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -w|--week)
      WEEK_OFFSET="${2:-}"
      shift 2
      ;;
    --from)
      FROM_DATE="${2:-}"
      shift 2
      ;;
    --to)
      TO_DATE="${2:-}"
      shift 2
      ;;
    --author)
      AUTHOR="${2:-}"
      shift 2
      ;;
    -L|--limit)
      LIMIT="${2:-}"
      shift 2
      ;;
    --no-files)
      FETCH_FILES=false
      shift
      ;;
    --files-cap)
      FILE_CAP="${2:-}"
      shift 2
      ;;
    --refresh-titles)
      REFRESH_TITLES=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
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

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install from https://cli.github.com/ or your OS package manager." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install from https://jqlang.github.io/jq/download/ or your OS package manager." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

# Resolve @me to actual login (GitHub search API doesn't support @me in author: qualifier)
if [[ "$AUTHOR" == "@me" ]]; then
  AUTHOR="$(gh api user --jq .login)"
fi

# Determine date range
if [[ -z "$FROM_DATE" && -z "$TO_DATE" ]]; then
  TODAY=$(date +"%Y-%m-%d")
  if [[ "$WEEK_OFFSET" -gt 0 ]]; then
    TODAY=$(date_week_offset "$TODAY" "$WEEK_OFFSET")
  fi
  MONDAY=$(iso_monday "$TODAY")
  FROM_DATE="$MONDAY"
  TO_DATE=$(iso_sunday "$MONDAY")
elif [[ -z "$FROM_DATE" || -z "$TO_DATE" ]]; then
  echo "--from and --to must be specified together." >&2
  exit 1
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Date range: $FROM_DATE .. $TO_DATE"
  echo "Author: $AUTHOR"
  echo "Command: gh search commits --author=$AUTHOR --committer-date=${FROM_DATE}..${TO_DATE} --sort=committer-date --order=asc --limit=$LIMIT --json repository,commit,parents,sha"
  echo "Command: gh search prs --author=$AUTHOR --merged --merged-at=${FROM_DATE}..${TO_DATE} --limit=$LIMIT --json repository,number,closedAt"
  exit 0
fi

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/weekly-report"
TITLE_CACHE="$CACHE_DIR/project-titles.tsv"
if [[ "$REFRESH_TITLES" == "true" ]]; then
  rm -f "$TITLE_CACHE"
fi

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

COMMITS_FILE="$TMP_DIR/commits.json"
PRS_FILE="$TMP_DIR/prs.json"
ITEMS_FILE="$TMP_DIR/items.jsonl"
FILES_FILE="$TMP_DIR/files.jsonl"
TITLES_FILE="$TMP_DIR/titles.jsonl"
: > "$ITEMS_FILE"
: > "$FILES_FILE"
: > "$TITLES_FILE"

trim() {
  sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

gh_raw() {
  gh api -H "Accept: application/vnd.github.raw" "repos/$1/contents/$2" 2>/dev/null || true
}

extract_html_title() {
  tr '\n' ' ' | sed -n 's/.*<title[^>]*>\([^<]*\)<\/title>.*/\1/p' | head -n 1
}

extract_metadata_title() {
  local content="$1"
  local found
  found="$(printf '%s' "$content" | grep -Eo "title:[[:space:]]*[\"'\`][^\"'\`]+" | head -n 1 | sed -E "s/title:[[:space:]]*[\"'\`]//" || true)"
  if [[ -z "$found" ]]; then
    found="$(printf '%s' "$content" | grep -Eo "default:[[:space:]]*[\"'\`][^\"'\`]+" | head -n 1 | sed -E "s/default:[[:space:]]*[\"'\`]//" || true)"
  fi
  printf '%s' "$found" | trim
}

# 빌드 타임 치환 전 플레이스홀더나 스캐폴딩 기본 타이틀은 프로젝트명이 될 수 없다.
is_valid_title() {
  local t="$1"
  [[ -n "$t" ]] || return 1
  [[ "$t" != *"%"* ]] || return 1
  [[ "$t" != *"{{"* ]] || return 1
  [[ "$t" != *'${'* ]] || return 1

  local lowered
  lowered="$(printf '%s' "$t" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    "create next app"|"next app"|"next.js"|"nextjs"|"create react app"|"react app"|"react application"|\
    "vite app"|"vite + react"|"vite + react + ts"|"vite + react + typescript"|"vite"|\
    "document"|"app"|"home"|"my app"|"webpack app"|"untitled")
      return 1
      ;;
  esac

  return 0
}

# 보고서에 쓰는 프로젝트명은 HTML head 타이틀이며, 레포명은 최후의 수단이다.
resolve_project_title() {
  local repo="$1"
  local title="" content="" path=""

  if [[ -f "$TITLE_CACHE" ]]; then
    title="$(awk -F'\t' -v r="$repo" '$1 == r { print $2; exit }' "$TITLE_CACHE")"
    if [[ -n "$title" ]]; then
      printf '%s' "$title"
      return
    fi
  fi

  for path in index.html public/index.html src/index.html; do
    content="$(gh_raw "$repo" "$path")"
    [[ -z "$content" ]] && continue
    title="$(printf '%s' "$content" | extract_html_title | trim)"
    if is_valid_title "$title"; then
      break
    fi
    title=""
  done

  if [[ -z "$title" ]]; then
    for path in src/app/layout.tsx app/layout.tsx src/app/layout.js app/layout.js pages/_document.tsx pages/_app.tsx; do
      content="$(gh_raw "$repo" "$path")"
      [[ -z "$content" ]] && continue
      title="$(extract_metadata_title "$content")"
      if is_valid_title "$title"; then
        break
      fi
      title=""
    done
  fi

  if [[ -z "$title" ]]; then
    content="$(gh_raw "$repo" package.json)"
    if [[ -n "$content" ]]; then
      # npm 스코프(@org/)는 프로젝트명이 아니라 배포 네임스페이스다.
      title="$(printf '%s' "$content" | jq -r '.name // empty' 2>/dev/null | sed -E 's|^@[^/]+/||' | trim || true)"
      is_valid_title "$title" || title=""
    fi
  fi

  [[ -z "$title" ]] && title="${repo#*/}"

  mkdir -p "$CACHE_DIR"
  printf '%s\t%s\n' "$repo" "$title" >> "$TITLE_CACHE"
  printf '%s' "$title"
}

gh search commits \
  --author="$AUTHOR" \
  --committer-date="${FROM_DATE}..${TO_DATE}" \
  --sort=committer-date \
  --order=asc \
  --limit="$LIMIT" \
  --json repository,commit,parents,sha > "$COMMITS_FILE"

gh search prs \
  --author="$AUTHOR" \
  --merged \
  --merged-at="${FROM_DATE}..${TO_DATE}" \
  --limit="$LIMIT" \
  --json repository,number,closedAt > "$PRS_FILE"

COMMIT_RESULT_COUNT=$(jq 'length' "$COMMITS_FILE")
if [[ "$COMMIT_RESULT_COUNT" -ge "$LIMIT" ]]; then
  echo "[경고] 결과가 ${LIMIT}건 상한에 도달했습니다. --from/--to로 범위를 좁히거나 --limit을 높여 재시도하세요." >&2
fi

PR_RESULT_COUNT=$(jq 'length' "$PRS_FILE")
if [[ "$PR_RESULT_COUNT" -ge "$LIMIT" ]]; then
  echo "[경고] merge된 PR 결과가 ${LIMIT}건 상한에 도달했습니다. --from/--to로 범위를 좁히거나 --limit을 높여 재시도하세요." >&2
fi

jq -c '
  map(
    select(
      (.parents | length) < 2 and
      ((.commit.message | split("\n")[0]) | startswith("Merge ") | not) and
      ((.commit.message | split("\n")[0]) | startswith("Revert ") | not)
    )
  ) |
  map({
    repo: .repository.fullName,
    sha: (.sha // ""),
    subject: (.commit.message | split("\n")[0] | gsub("^\\s+|\\s+$"; "")),
    dateKey: (.commit.committer.date | split("T")[0]),
    date: (.commit.committer.date | split("T")[0] | split("-") | "\(.[1] | tonumber)/\(.[2] | tonumber)")
  })[] |
  select(.subject != "")
' "$COMMITS_FILE" >> "$ITEMS_FILE"

while IFS=$'\t' read -r repo number; do
  if [[ -z "$repo" || -z "$number" ]]; then
    continue
  fi

  PR_DETAIL_FILE="$TMP_DIR/pr-${repo//\//-}-${number}.json"
  if ! gh pr view "$number" \
    --repo "$repo" \
    --json commits,mergedAt > "$PR_DETAIL_FILE"; then
    echo "[경고] ${repo}#${number} PR 커밋 조회에 실패해 건너뜁니다." >&2
    continue
  fi

  jq -c --arg repo "$repo" '
    .mergedAt as $mergedAt |
    (.commits // [])[] |
    {
      repo: $repo,
      sha: (.oid // .sha // ""),
      subject: ((.messageHeadline // .commit.messageHeadline // .message // "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")),
      dateKey: ($mergedAt | split("T")[0]),
      date: ($mergedAt | split("T")[0] | split("-") | "\(.[1] | tonumber)/\(.[2] | tonumber)")
    } |
    select(.dateKey != null) |
    select(.subject != "")
  ' "$PR_DETAIL_FILE" >> "$ITEMS_FILE"
done < <(jq -r '.[] | [(.repository.fullName // .repository.nameWithOwner), .number] | @tsv' "$PRS_FILE")

if [[ ! -s "$ITEMS_FILE" ]]; then
  echo "해당 기간($FROM_DATE ~ $TO_DATE) 커밋 없음"
  exit 0
fi

while IFS= read -r repo; do
  [[ -z "$repo" ]] && continue
  title="$(resolve_project_title "$repo")"
  jq -nc --arg repo "$repo" --arg title "$title" '{repo: $repo, title: $title}' >> "$TITLES_FILE"
done < <(jq -r -s 'map(.repo) | unique[]' "$ITEMS_FILE")

if [[ "$FETCH_FILES" == "true" ]]; then
  COMMIT_PAIR_COUNT="$(jq -r -s 'map(select(.sha != "")) | map(.repo + "\t" + .sha) | unique | length' "$ITEMS_FILE")"
  if [[ "$COMMIT_PAIR_COUNT" -gt 0 ]]; then
    echo "[정보] 커밋 ${COMMIT_PAIR_COUNT}건의 변경 파일을 조회합니다. (--no-files로 생략 가능)" >&2
  fi

  while IFS=$'\t' read -r repo sha; do
    [[ -z "$repo" || -z "$sha" ]] && continue
    files_json="$(gh api "repos/$repo/commits/$sha" --jq '[.files[]?.filename] | tostring' 2>/dev/null || true)"
    if [[ -z "$files_json" ]]; then
      echo "[경고] ${repo}@${sha:0:7} 변경 파일 조회에 실패해 건너뜁니다." >&2
      files_json='[]'
    fi
    jq -nc --arg repo "$repo" --arg sha "$sha" --argjson files "$files_json" \
      '{repo: $repo, sha: $sha, files: $files}' >> "$FILES_FILE"
  done < <(jq -r -s 'map(select(.sha != "")) | map(.repo + "\t" + .sha) | unique[]' "$ITEMS_FILE")
fi

OUTPUT=$(jq -s -r \
  --slurpfile titles "$TITLES_FILE" \
  --slurpfile filemap "$FILES_FILE" \
  --argjson fileCap "$FILE_CAP" '
  def dirof: if test("/") then sub("/[^/]*$"; "") else "(루트)" end;

  # 라우트 경로에서 화면 영역만 남긴다. 파일명·그룹 세그먼트·프레임워크 예약 파일명은 영역이 아니다.
  def route_from($path):
    ($path | split("/")) as $seg |
    ($seg | last) as $l |
    (
      if ($l | test("\\.")) then
        (
          if (($l | test("\\.[jt]sx?$")) and (($l | test("^[A-Z]")) | not)) then ($seg[:-1] + [$l | sub("\\.[jt]sx?$"; "")])
          else $seg[:-1] end
        )
      else $seg end
    )
    | map(select(test("^\\(.*\\)$") | not))
    | map(select(test("^_") | not))
    | map(select(test("^(index|page|layout|loading|error|not-found|template|route|default|middleware)$") | not))
    | map(select(. != "")) as $named
    # 화면 디렉터리 내부의 구조용 폴더는 라우트가 아니므로 뒤에서부터 걷어낸다.
    | reduce range(0; ($named | length)) as $i ($named;
        if (length > 0) and ((last | test("^(components|ui|model|lib|libs|config|hooks|utils|helpers|styles|types|constants|store|stores|assets|tests|__tests__)$")))
        then .[:-1] else . end
      ) as $cleaned
    | if ($cleaned | length) > 0 then ($cleaned | join("/"))
      elif ($l | test("^(layout|template)\\.")) then "공통/레이아웃"
      else "홈" end;

  # 화면·도메인 영역 추정. 라우트 트리를 먼저 보고, 없으면 화면·feature 디렉터리를 쓴다.
  def area:
    if test("(^|/)app/") then route_from(capture("(^|/)app/(?<r>.+)$").r)
    elif test("(^|/)(pages|routes)/") then route_from(capture("(^|/)(pages|routes)/(?<r>.+)$").r)
    elif test("(^|/)(screens|views|features|domains|modules|containers|widgets|entities)/") then
      (capture("(^|/)(screens|views|features|domains|modules|containers|widgets|entities)/(?<n>[^/]+)").n | sub("\\.[jt]sx?$"; ""))
    # components/ 아래에 화면을 두는 레포가 있어, 도메인 폴더가 있으면 화면으로 인정한다.
    elif test("(^|/)components/") then
      (
        (capture("(^|/)components/(?<r>.+)$").r | split("/") | map(select(test("\\.") | not))) as $dirs |
        if ($dirs | length) == 0 then "공통/components"
        elif ($dirs[0] | test("^(common|ui|shared|layout|base|atoms|molecules|organisms|styles?|icons)$"; "i")) then "공통/components"
        else ($dirs | map(select(test("^(common|ui|styles?|icons|hooks|utils|types|constants)$"; "i") | not)) | .[0:2] | join("/"))
        end
      )
    elif test("(^|/)(shared|common|hooks|utils|lib|libs|store|stores|styles|api|apis|queries|mutations|services|types|constants|ui|assets|providers|contexts|layouts)(/|$)") then
      ("공통/" + capture("(^|/)(?<n>shared|common|hooks|utils|lib|libs|store|stores|styles|api|apis|queries|mutations|services|types|constants|ui|assets|providers|contexts|layouts)(/|$)").n)
    else "기타" end;

  # 큰 업무 분류 힌트. 커밋 메시지 접두사가 아니라 실제 변경 경로에서 뽑는다.
  def signal:
    if test("\\.(css|scss|sass|less)$") or test("(^|/)styles?/") or test("\\.styles?\\.[jt]sx?$") or test("(^|/)styles?\\.[jt]sx?$") or test("(^|/)assets/") then "퍼블리싱"
    elif test("(^|/)(api|apis|services|queries|mutations)/") or test("\\.(api|service|query|dto)\\.[jt]s$") or test("(^|/)hooks/use[A-Za-z]*(Query|Mutation)") then "API 연결"
    elif test("^\\.github/") or test("(^|/)(vite|next|webpack|tailwind|eslint|prettier|tsconfig|vercel|docker|amplify)") or test("(^|/)(package\\.json|pnpm-lock\\.yaml|Dockerfile)$") or test("(^|/)\\.env") or test("(^|/)scripts?/") or test("\\.(sh|ya?ml)$") then "배포/환경 설정"
    else "기능개발" end;

  ($titles | map({key: .repo, value: .title}) | from_entries) as $T |
  ($filemap | map({key: (.repo + "|" + .sha), value: .files}) | from_entries) as $F |

  map(
    select(
      (.subject | startswith("Merge ") | not) and
      (.subject | startswith("Revert ") | not)
    )
  ) |
  map(. + {files: ($F[.repo + "|" + .sha] // [])}) |
  group_by(.repo + "|" + .subject) |
  map({
    repo: .[0].repo,
    subject: .[0].subject,
    dateKey: (map(.dateKey) | max),
    files: (map(.files[]) | unique)
  }) |
  map(. + {
    date: (.dateKey | split("-") | "\(.[1] | tonumber)/\(.[2] | tonumber)"),
    areas: (.files | map(area) | unique),
    signals: (.files | map(signal) | unique)
  }) |
  group_by(.repo) |
  sort_by($T[.[0].repo] // .[0].repo) |
  map(
    "[" + ($T[.[0].repo] // (.[0].repo | split("/") | last)) + "] (" + .[0].repo + ")" + "\n" +
    (
      sort_by(.dateKey, .subject) |
      map(
        "- " + .subject + " ~" + .date
        + (if (.areas | length) > 0 then "\n  영역: " + (.areas | join(", ")) else "" end)
        + (if (.signals | length) > 0 then "\n  신호: " + (.signals | join(", ")) else "" end)
        # 파일이 많은 커밋은 경로를 전부 늘어놓지 않고 디렉터리로 접는다. 성격은 이미 영역·신호에 담겨 있다.
        + (if (.files | length) == 0 then ""
           elif (.files | length) > $fileCap
             then "\n  파일: " + (.files | map(dirof) | unique | .[0:$fileCap] | join(", "))
                  + " 등 " + ((.files | length) | tostring) + "개 파일"
             else "\n  파일: " + (.files | join(", ")) end)
      ) | join("\n")
    )
  ) |
  join("\n\n")
' "$ITEMS_FILE")

if [[ -z "$OUTPUT" ]]; then
  echo "해당 기간($FROM_DATE ~ $TO_DATE) 커밋 없음"
  exit 0
fi

echo "# weekly-report 수집 결과 ($FROM_DATE ~ $TO_DATE / $AUTHOR)"
echo
echo "$OUTPUT"
