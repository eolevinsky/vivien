#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACT_DIR="${VIVIEN_API_PLESK_ARTIFACT_DIR:-${API_DIR}/build-artifacts}"
STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
ZIP_NAME="${VIVIEN_API_PLESK_ZIP_NAME:-vivien-api-plesk-${STAMP}.zip}"
ZIP_PATH="${ARTIFACT_DIR}/${ZIP_NAME}"

log() {
  printf '[api-plesk-zip] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[api-plesk-zip] Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

require_file() {
  if [ ! -f "${API_DIR}/$1" ]; then
    printf '[api-plesk-zip] Missing required file: %s\n' "$1" >&2
    exit 1
  fi
}

require_command zip
require_file composer.json
require_file composer.lock
require_file public/index.php
require_file src/App.php
require_file migrations/001_initial.sql
require_file .env.example

mkdir -p "${ARTIFACT_DIR}"

log "Using API directory: ${API_DIR}"
log "Creating Plesk API zip: ${ZIP_PATH}"
(
  cd "${API_DIR}"
  find . -type f \
    ! -path './build-artifacts/*' \
    ! -path './vendor/*' \
    ! -path './var/*' \
    ! -path './.phpunit.cache/*' \
    ! -path './.env' \
    ! -name '.DS_Store' \
    -print | LC_ALL=C sort | zip -q -@ "${ZIP_PATH}"
)

log "Done"
du -h "${ZIP_PATH}"

if command -v unzip >/dev/null 2>&1; then
  unzip -l "${ZIP_PATH}" | tail -n 1
fi
