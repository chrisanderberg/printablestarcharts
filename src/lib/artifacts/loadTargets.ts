import type { CanonicalTarget, CanonicalTargetCollection } from './types';
import { readGeneratedJson } from './loadShared';

export async function loadTargets(): Promise<CanonicalTarget[]> {
  const collection = await readGeneratedJson<CanonicalTargetCollection>('/generated/targets/index.json');
  return collection.items;
}
