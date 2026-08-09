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

NODE_EXEC=node

node_version_satisfies() {
  local required="$1"
  "$NODE_EXEC" - "$required" <<'NODE'
const required = process.argv[1];
const [maj, min, patch] = process.version.slice(1).split('.').map(Number);
const [rmaj, rmin, rpatch] = required.split('.').map(Number);
const satisfies = maj > rmaj || (maj === rmaj && (min > rmin || (min === rmin && patch >= rpatch)));
process.stdout.write(satisfies ? '1' : '0');
NODE
}

menu_updated_at() {
  "$NODE_EXEC" -e "const fs = require('node:fs'); const path = 'src/content/menu-cache.json'; try { const data = JSON.parse(fs.readFileSync(path, 'utf8')); process.stdout.write(data.updatedAt || ''); } catch (_) {}"
}

require_command zip
require_command curl

if [ ! -s "${SITE_DIR}/.nvmrc" ]; then
  printf '[plesk-zip] Missing .nvmrc in %s\n' "${SITE_DIR}" >&2
  exit 1
fi

NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"

log "Using site directory: ${SITE_DIR}"
log "Preparing Node ${NODE_VERSION}"

cd "${SITE_DIR}"
if [ -s "${NVM_DIR}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
  if ! nvm use; then
    log "Node ${NODE_VERSION} is not installed locally; installing through nvm"
    nvm install
    nvm use
  fi
  NODE_EXEC=node
else
  if [ -x "/Users/edwardole/.nvm/versions/node/v20.19.6/bin/node" ]; then
    NODE_EXEC="/Users/edwardole/.nvm/versions/node/v20.19.6/bin/node"
  elif command -v node >/dev/null 2>&1; then
    NODE_EXEC=node
  else
    printf '[plesk-zip] nvm not found and system node is unavailable in PATH.\n' >&2
    printf '[plesk-zip] Install nvm or ensure compatible node is on PATH.\n' >&2
    exit 1
  fi
  if ! "$NODE_EXEC" -v >/dev/null 2>&1; then
    printf '[plesk-zip] Selected Node executable %s is not usable.\n' "$NODE_EXEC" >&2
    exit 1
  fi
  if ! node_version_satisfies "${NODE_VERSION}"; then
    printf '[plesk-zip] System Node %s does not satisfy required version %s\n' "$($NODE_EXEC -v)" "${NODE_VERSION}" >&2
    printf '[plesk-zip] Install %s via nvm or use a compatible Node version.\n' "${NODE_VERSION}" >&2
    exit 1
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '[plesk-zip] npm is unavailable in PATH.\n' >&2
  exit 1
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
