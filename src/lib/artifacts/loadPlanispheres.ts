import type {
  PlanisphereIndex,
  PlanisphereIndexItem,
  PlanisphereManifest,
} from './types';
import { readGeneratedJson } from './loadShared';

export interface LoadedPlanisphere extends PlanisphereIndexItem, PlanisphereManifest {}

export async function loadPlanispheres(): Promise<LoadedPlanisphere[]> {
  const index = await readGeneratedJson<PlanisphereIndex>('/generated/planispheres/index.json');
  const manifests = await Promise.all(
    index.items.map((item) => readGeneratedJson<PlanisphereManifest>(item.manifestPath))
  );

  return index.items.map((item, indexItem) => ({
    ...item,
    ...manifests[indexItem],
  }));
}
