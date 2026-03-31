const DEFAULT_GITHUB_OWNER = 'chrisanderberg';
const DEFAULT_GITHUB_REPO = 'printablestarcharts';

function readEnv(name: string): string | undefined {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = processEnv?.[name]?.trim();
  return value ? value : undefined;
}

export const SITE_NAME = 'printablestarcharts';
export const SITE_TAGLINE = 'Readable star charts for print and field use.';
export const GITHUB_OWNER = readEnv('GITHUB_OWNER') ?? DEFAULT_GITHUB_OWNER;
export const GITHUB_REPO = readEnv('GITHUB_REPO') ?? DEFAULT_GITHUB_REPO;

export function isUserOrOrganizationPagesRepo(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO
): boolean {
  return repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
}

export function getSiteOrigin(owner: string = GITHUB_OWNER): string {
  return `https://${owner}.github.io`;
}

export function getBasePath(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO
): string {
  return isUserOrOrganizationPagesRepo(owner, repo) ? '/' : `/${repo}`;
}

export function withBasePath(base: string, path = ''): string {
  const normalizedBase = base === '/' ? '' : base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : `${normalizedBase}/`;
}
