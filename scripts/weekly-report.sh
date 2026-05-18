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

Generate a weekly report from your GitHub commits and recently merged PR commits.

Options:
  -w, --week <n>           Weeks ago (0 = this week, 1 = last week). Default: 0
      --from <YYYY-MM-DD>  Start date inclusive. Overrides --week.
      --to   <YYYY-MM-DD>  End date inclusive. Overrides --week.
      --author <login>     GitHub login. Default: @me (authenticated user)
  -L, --limit <n>          Max commits and merged PRs to fetch per query. Default: 200
      --dry-run            Print date range and gh command, then exit
  -h, --help               Show this help

Examples:
  weekly-report
  weekly-report --week 1
  weekly-report --from 2026-04-13 --to 2026-04-19
  weekly-report --author octocat
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

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

COMMITS_FILE="$TMP_DIR/commits.json"
PRS_FILE="$TMP_DIR/prs.json"
ITEMS_FILE="$TMP_DIR/items.jsonl"
: > "$ITEMS_FILE"

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
      subject: ((.messageHeadline // .commit.messageHeadline // .message // "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")),
      dateKey: ($mergedAt | split("T")[0]),
      date: ($mergedAt | split("T")[0] | split("-") | "\(.[1] | tonumber)/\(.[2] | tonumber)")
    } |
    select(.dateKey != null) |
    select(.subject != "")
  ' "$PR_DETAIL_FILE" >> "$ITEMS_FILE"
done < <(jq -r '.[] | [(.repository.fullName // .repository.nameWithOwner), .number] | @tsv' "$PRS_FILE")

OUTPUT=$(jq -s -r '
  map(
    select(
      (.subject | startswith("Merge ") | not) and
      (.subject | startswith("Revert ") | not)
    )
  ) |
  sort_by(.repo, .dateKey, .subject) |
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
' "$ITEMS_FILE")

if [[ -z "$OUTPUT" ]]; then
  echo "해당 기간($FROM_DATE ~ $TO_DATE) 커밋 없음"
  exit 0
fi

echo "$OUTPUT"
