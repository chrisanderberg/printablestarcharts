import type {
  ConstellationIndex,
  ConstellationIndexItem,
  ConstellationManifest,
} from './types';
import { readGeneratedJson } from './loadShared';

export interface LoadedConstellation extends ConstellationIndexItem, ConstellationManifest {}

export async function loadConstellations(): Promise<LoadedConstellation[]> {
  const index = await readGeneratedJson<ConstellationIndex>('/generated/constellations/index.json');
  const manifests = await Promise.all(
    index.items.map((item) => readGeneratedJson<ConstellationManifest>(item.manifestPath))
  );

  return index.items
    .map((item, indexItem) => ({
      ...item,
      ...manifests[indexItem],
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
