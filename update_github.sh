#!/bin/bash
# updat_github.sh
# Simple helper to add/commit/pull/rebase and push changes to the configured remote branch.
# Usage:
#   ./updat_github.sh "commit message" [branch] [remote]
# Example:
#   ./updat_github.sh "fix: update dockerfile" main origin

set -euo pipefail

MSG="${1:-chore: update code}"
BRANCH="${2:-main}"
REMOTE="${3:-origin}"

# Ensure we're in a git repo
if [ ! -d .git ]; then
  echo "Error: this directory is not a git repository."
  exit 1
fi

# Ensure working tree is clean enough to proceed
echo "Staging all changes..."
git add -A

# Only commit if there are staged changes
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  echo "Committing changes with message: $MSG"
  git commit -m "$MSG"
fi

# Fetch and rebase latest from remote branch to avoid unnecessary merge commits
echo "Fetching and rebasing from ${REMOTE}/${BRANCH}..."
git fetch "${REMOTE}"
# If branch doesn't exist locally, create it tracking remote if available
if ! git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  if git ls-remote --exit-code --heads "${REMOTE}" "${BRANCH}" >/dev/null 2>&1; then
    git checkout -b "${BRANCH}" --track "${REMOTE}/${BRANCH}"
  else
    git checkout -b "${BRANCH}"
  fi
fi

# Rebase if remote branch exists
if git ls-remote --exit-code --heads "${REMOTE}" "${BRANCH}" >/dev/null 2>&1; then
  git pull --rebase "${REMOTE}" "${BRANCH}"
else
  echo "Remote branch ${REMOTE}/${BRANCH} not found; skipping pull --rebase."
fi

# Push local branch to remote
echo "Pushing to ${REMOTE}/${BRANCH}..."
git push "${REMOTE}" "${BRANCH}"

echo "Done. Pushed to ${REMOTE}/${BRANCH}."
