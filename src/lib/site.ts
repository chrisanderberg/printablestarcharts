const DEFAULT_GITHUB_OWNER = 'christopheranderberg';
const DEFAULT_GITHUB_REPO = 'printablestarcharts';
const DEFAULT_SITE_ORIGIN = 'https://printablestarcharts.app';

function readEnv(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = processEnv?.[name]?.trim();
  return value ? value : undefined;
}

export const SITE_NAME = 'printablestarcharts';
export const SITE_TAGLINE = 'Readable star charts for print and field use.';
export const GITHUB_OWNER = readEnv('GITHUB_OWNER') ?? DEFAULT_GITHUB_OWNER;
export const GITHUB_REPO = readEnv('GITHUB_REPO') ?? DEFAULT_GITHUB_REPO;
export const SITE_ORIGIN = readEnv('SITE_ORIGIN') ?? DEFAULT_SITE_ORIGIN;
export const BASE_PATH = readEnv('BASE_PATH');

export function isUserOrOrganizationPagesRepo(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO
): boolean {
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
}

export function getSiteOrigin(): string {
  return SITE_ORIGIN;
}

export function getBasePath(
  siteOrigin: string = SITE_ORIGIN,
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO
): string {
  if (BASE_PATH) {
    return normalizeBasePath(BASE_PATH);
  }

  const hostname = safeHostname(siteOrigin);
  if (hostname && hostname !== `${owner.toLowerCase()}.github.io`) {
    return '/';
  }

  return isUserOrOrganizationPagesRepo(owner, repo) ? '/' : `/${repo}`;
}

export function withBasePath(base: string, path = ''): string {
  const normalizedBase = base === '/' ? '' : base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : `${normalizedBase}/`;
}

function safeHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
