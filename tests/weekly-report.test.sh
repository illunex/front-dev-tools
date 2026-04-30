#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v ruby >/dev/null 2>&1; then
  ruby -e 'require "psych"; text = File.read(ARGV.fetch(0)); yaml = text.split(/^---\s*$/, 3).fetch(1); Psych.safe_load(yaml)' "$ROOT_DIR/skills/weekly-report/SKILL.md"
fi

TEST_TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TEST_TMP"
}
trap cleanup EXIT

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

echo "unexpected gh call: $*" >&2
exit 1
STUB

cat > "$BIN_DIR/jq" <<'STUB'
#!/bin/bash
exit 0
STUB

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

output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --dry-run)"
assert_contains "$output" "Date range: 2026-04-20 .. 2026-04-26"
assert_contains "$output" "Author: octocat"

last_week_output="$(PATH="$BIN_DIR:$PATH" bash "$ROOT_DIR/scripts/weekly-report.sh" --week 1 --dry-run)"
assert_contains "$last_week_output" "Date range: 2026-04-13 .. 2026-04-19"

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
