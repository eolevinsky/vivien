import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'" || quote === '`') && value.endsWith(quote)) {
    const unquoted = value.slice(1, -1);
    return quote === '"' ? unquoted.replace(/\\n/g, '\n').replace(/\\r/g, '\r') : unquoted;
  }
  return value.replace(/\s+#.*$/, '').trim();
}

function candidateEnvPaths() {
  const paths = [];
  const add = (candidate) => {
    if (candidate && !paths.includes(candidate)) paths.push(candidate);
  };

  add(process.env.VIVIEN_HOME_ENV_PATH);
  add(process.env.HOME ? path.join(process.env.HOME, '.env') : null);
  add(path.join(homedir(), '.env'));

  let dir = process.cwd();
  for (let depth = 0; depth < 12; depth += 1) {
    if (path.basename(dir) === 'httpdocs') add(path.join(path.dirname(dir), '.env'));
    add(path.join(dir, '.env'));

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return paths;
}

export function loadHomeEnv(envPath = null) {
  const resolvedEnvPath = envPath || candidateEnvPaths().find((candidate) => existsSync(candidate));
  if (!resolvedEnvPath) return [];

  envPath = resolvedEnvPath;
  if (!envPath || !existsSync(envPath)) return [];

  const loaded = [];
  const lines = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue;

    process.env[key] = parseEnvValue(normalized.slice(separatorIndex + 1));
    loaded.push(key);
  }

  return loaded;
}
