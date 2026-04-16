#!/bin/bash
set -euo pipefail

ENV_NAME="development"
OUTPUT_FILE=""
REPO=""

usage() {
  cat <<'EOF'
Usage: sync-env [options]

Sync GitHub Actions environment variables into a local .env file.

Options:
  -e, --env <name>      GitHub environment name. Default: development
  -o, --output <file>   Output file path. Default: .env.<env>
  -r, --repo <owner/repo>
                        GitHub repository. Default: inferred from git remote origin
  -h, --help            Show this help message

Examples:
  sync-env
  sync-env --env production --output .env.production
  sync-env --repo your-org/your-repo
EOF
}

infer_repo_from_git_remote() {
  local remote_url repo_path

  remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
  if [[ -z "$remote_url" ]]; then
    echo "Failed to infer repository from git remote origin." >&2
    echo "Pass --repo <owner/repo> explicitly." >&2
    exit 1
  fi

  case "$remote_url" in
    git@github.com:*)
      repo_path="${remote_url#git@github.com:}"
      ;;
    https://github.com/*)
      repo_path="${remote_url#https://github.com/}"
      ;;
    *)
      echo "Unsupported git remote URL: $remote_url" >&2
      echo "Pass --repo <owner/repo> explicitly." >&2
      exit 1
      ;;
  esac

  repo_path="${repo_path%.git}"
  echo "$repo_path"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENV_NAME="${2:-}"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    -r|--repo)
      REPO="${2:-}"
      shift 2
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

if [[ -z "$ENV_NAME" ]]; then
  echo "--env requires a non-empty value." >&2
  exit 1
fi

if [[ -z "$OUTPUT_FILE" ]]; then
  OUTPUT_FILE=".env.${ENV_NAME}"
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if [[ -z "$REPO" ]]; then
  REPO="$(infer_repo_from_git_remote)"
fi

TMP_FILE="$(mktemp)"
cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

gh variable list \
  --env "$ENV_NAME" \
  --repo "$REPO" \
  --json name,value \
  --template '{{range .}}{{.name}}={{.value}}{{"\n"}}{{end}}' > "$TMP_FILE"

if [[ ! -s "$TMP_FILE" ]]; then
  echo "No GitHub Actions variables found for environment '$ENV_NAME' in '$REPO'." >&2
  exit 1
fi

mv "$TMP_FILE" "$OUTPUT_FILE"
chmod 600 "$OUTPUT_FILE"

echo "Synced GitHub Actions variables from '$REPO' environment '$ENV_NAME' to '$OUTPUT_FILE'."
