import { readFile } from 'node:fs/promises';
import path from 'node:path';

function getPublicRoot() {
  return path.join(process.cwd(), 'site-public');
}

export function generatedPathToFilePath(assetPath: string) {
  return path.join(getPublicRoot(), assetPath.replace(/^\//, ''));
}

export async function readGeneratedJson<T>(assetPath: string): Promise<T> {
  const filePath = generatedPathToFilePath(assetPath);
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}
