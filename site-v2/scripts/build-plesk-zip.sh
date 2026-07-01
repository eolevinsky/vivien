#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${SITE_DIR}/dist"
ARTIFACT_DIR="${VIVIEN_PLESK_ARTIFACT_DIR:-${SITE_DIR}/build-artifacts}"
NODE_VERSION="$(tr -d '[:space:]' < "${SITE_DIR}/.nvmrc")"
STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
ZIP_NAME="${VIVIEN_PLESK_ZIP_NAME:-vivien-site-v2-plesk-${STAMP}.zip}"
ZIP_PATH="${ARTIFACT_DIR}/${ZIP_NAME}"

log() {
  printf '[plesk-zip] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[plesk-zip] Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

menu_updated_at() {
  node -e "const fs = require('node:fs'); const path = 'src/content/menu-cache.json'; try { const data = JSON.parse(fs.readFileSync(path, 'utf8')); process.stdout.write(data.updatedAt || ''); } catch (_) {}"
}

if [ ! -s "${SITE_DIR}/.nvmrc" ]; then
  printf '[plesk-zip] Missing .nvmrc in %s\n' "${SITE_DIR}" >&2
  exit 1
fi

NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
  printf '[plesk-zip] nvm not found at %s/nvm.sh\n' "${NVM_DIR}" >&2
  printf '[plesk-zip] Install nvm first, then rerun this script.\n' >&2
  exit 1
fi

require_command zip

log "Using site directory: ${SITE_DIR}"
log "Preparing Node ${NODE_VERSION}"

# shellcheck disable=SC1090
. "${NVM_DIR}/nvm.sh"
cd "${SITE_DIR}"
if ! nvm use; then
  log "Node ${NODE_VERSION} is not installed locally; installing through nvm"
  nvm install
  nvm use
fi

if [ ! -d "${SITE_DIR}/node_modules" ]; then
  log "Installing npm dependencies"
  npm install
else
  log "npm dependencies already installed"
fi

MENU_UPDATED_BEFORE="$(menu_updated_at)"

log "Building production site; npm prebuild refreshes menu and gallery caches"
npm run build

if [ ! -d "${DIST_DIR}" ]; then
  printf '[plesk-zip] Build did not create %s\n' "${DIST_DIR}" >&2
  exit 1
fi

MENU_UPDATED_AFTER="$(menu_updated_at)"
if [ "${VIVIEN_PLESK_ALLOW_STALE_MENU:-0}" != "1" ] && [ "${MENU_UPDATED_AFTER}" = "${MENU_UPDATED_BEFORE}" ]; then
  printf '[plesk-zip] Menu cache was not refreshed; refusing to create a production zip.\n' >&2
  printf '[plesk-zip] Rerun when the A3 menu endpoint is reachable, or set VIVIEN_PLESK_ALLOW_STALE_MENU=1 to override.\n' >&2
  exit 1
fi

mkdir -p "${ARTIFACT_DIR}"

log "Creating Plesk zip: ${ZIP_PATH}"
(
  cd "${DIST_DIR}"
  find . -type f -print | LC_ALL=C sort | zip -q -@ "${ZIP_PATH}"
)

log "Done"
du -h "${ZIP_PATH}"

if command -v unzip >/dev/null 2>&1; then
  unzip -l "${ZIP_PATH}" | tail -n 1
fi
