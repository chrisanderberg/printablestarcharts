import type {
  ConstellationIndex,
  ConstellationIndexItem,
  ConstellationManifest,
} from './types';
import { readGeneratedJson } from './loadShared';

export interface LoadedConstellation extends ConstellationIndexItem, ConstellationManifest {
  routeSlug: string;
}

export async function loadConstellations(): Promise<LoadedConstellation[]> {
  const index = await readGeneratedJson<ConstellationIndex>('/generated/constellations/index.json');
  const manifests = await Promise.all(
    index.items.map((item) => readGeneratedJson<ConstellationManifest>(item.manifestPath))
  );

  const baseItems = index.items.map((item, indexItem) => ({
    ...item,
    ...manifests[indexItem],
  }));

  const slugCounts = new Map<string, number>();
  for (const item of baseItems) {
    slugCounts.set(item.slug, (slugCounts.get(item.slug) ?? 0) + 1);
  }

  return baseItems
    .map((item) => ({
      ...item,
      routeSlug:
        (slugCounts.get(item.slug) ?? 0) > 1 ? `${item.slug}-${item.id.toLowerCase()}` : item.slug,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
