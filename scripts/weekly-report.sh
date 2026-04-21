#!/bin/bash
set -euo pipefail

WEEK_OFFSET=0
FROM_DATE=""
TO_DATE=""
AUTHOR="@me"
LIMIT=200
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: weekly-report [options]

Generate a weekly report from your GitHub commits.

Options:
  -w, --week <n>           Weeks ago (0 = this week, 1 = last week). Default: 0
      --from <YYYY-MM-DD>  Start date inclusive. Overrides --week.
      --to   <YYYY-MM-DD>  End date inclusive. Overrides --week.
      --author <login>     GitHub login. Default: @me (authenticated user)
  -L, --limit <n>          Max commits to fetch. Default: 200
      --dry-run            Print date range and gh command, then exit
  -h, --help               Show this help

Examples:
  weekly-report
  weekly-report --week 1
  weekly-report --from 2026-04-13 --to 2026-04-19
  weekly-report --author octocat
EOF
}

# macOS BSD date: get ISO week Monday for a given YYYY-MM-DD
iso_monday() {
  local d="$1"
  local dow
  dow=$(date -j -f "%Y-%m-%d" "$d" +"%u")  # 1=Mon ... 7=Sun
  local back=$(( dow - 1 ))
  if [[ $back -eq 0 ]]; then
    echo "$d"
  else
    date -j -v-${back}d -f "%Y-%m-%d" "$d" +"%Y-%m-%d"
  fi
}

iso_sunday() {
  date -j -v+6d -f "%Y-%m-%d" "$1" +"%Y-%m-%d"
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
  echo "GitHub CLI (gh) is required. Install: brew install gh" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install: brew install jq" >&2
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
    TODAY=$(date -j -v-${WEEK_OFFSET}w +"%Y-%m-%d")
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
  exit 0
fi

TMP_FILE="$(mktemp)"
cleanup() { rm -f "$TMP_FILE"; }
trap cleanup EXIT

gh search commits \
  --author="$AUTHOR" \
  --committer-date="${FROM_DATE}..${TO_DATE}" \
  --sort=committer-date \
  --order=asc \
  --limit="$LIMIT" \
  --json repository,commit,parents,sha > "$TMP_FILE"

RESULT_COUNT=$(jq 'length' "$TMP_FILE")
if [[ "$RESULT_COUNT" -ge "$LIMIT" ]]; then
  echo "[경고] 결과가 ${LIMIT}건 상한에 도달했습니다. --from/--to로 범위를 좁히거나 --limit을 높여 재시도하세요." >&2
fi

OUTPUT=$(jq -r '
  map(
    select(
      (.parents | length) < 2 and
      ((.commit.message | split("\n")[0]) | startswith("Merge ") | not) and
      ((.commit.message | split("\n")[0]) | startswith("Revert ") | not)
    )
  ) |
  map({
    repo: .repository.fullName,
    subject: (.commit.message | split("\n")[0] | gsub("^\\s+|\\s+$"; "")),
    date: (.commit.committer.date | split("T")[0] | split("-") | "\(.[1] | tonumber)/\(.[2] | tonumber)")
  }) |
  reduce .[] as $item (
    {seen: {}, items: []};
    if (.seen[$item.repo + "|" + $item.subject] | not) then
      {
        seen: (.seen + {($item.repo + "|" + $item.subject): true}),
        items: (.items + [$item])
      }
    else . end
  ) | .items |
  group_by(.repo) |
  map(
    "[" + .[0].repo + "]" + "\n" +
    (map("- " + .subject + " ~" + .date + " 100%") | join("\n"))
  ) |
  join("\n\n")
' "$TMP_FILE")

if [[ -z "$OUTPUT" ]]; then
  echo "해당 기간($FROM_DATE ~ $TO_DATE) 커밋 없음"
  exit 0
fi

echo "$OUTPUT"
