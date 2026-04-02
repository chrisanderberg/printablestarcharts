import { useEffect, useState } from 'react';

import type { LoadedConstellation } from '@/lib/artifacts/loadConstellations';
import type { LoadedPlanisphere } from '@/lib/artifacts/loadPlanispheres';
import type {
  CanonicalTarget,
  CanonicalTargetCollection,
  ConstellationIndex,
  ConstellationManifest,
  PlanisphereIndex,
  PlanisphereManifest,
} from '@/lib/artifacts/types';
import ConstellationBrowser from '@/components/charts/ConstellationBrowser';
import PlanisphereForm from '@/components/planisphere/PlanisphereForm';
import ForcedTargetInput from '@/components/targets/ForcedTargetInput';
import { withBasePath } from '@/lib/site';

interface Props {
  basePath: string;
}

async function fetchJson<T>(input: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(input, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load ${input}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export default function ChartWorkbench({
  basePath,
}: Props) {
  const [constellations, setConstellations] = useState<LoadedConstellation[]>([]);
  const [planispheres, setPlanispheres] = useState<LoadedPlanisphere[]>([]);
  const [canonicalTargets, setCanonicalTargets] = useState<CanonicalTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(['m31', 'm42']);
  const latitudeBands = [...new Set(planispheres.map((artifact) => artifact.latitudeBand))];

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkbenchData() {
      try {
        setLoading(true);
        setLoadError(null);

        const [constellationIndex, planisphereIndex, targetIndex] = await Promise.all([
          fetchJson<ConstellationIndex>(
            withBasePath(basePath, '/generated/constellations/index.json'),
            controller.signal
          ),
          fetchJson<PlanisphereIndex>(
            withBasePath(basePath, '/generated/planispheres/index.json'),
            controller.signal
          ),
          fetchJson<CanonicalTargetCollection>(
            withBasePath(basePath, '/generated/targets/index.json'),
            controller.signal
          ),
        ]);

        const [constellationManifests, planisphereManifests] = await Promise.all([
          Promise.all(
            constellationIndex.items.map((item: { manifestPath: string }) =>
              fetchJson<ConstellationManifest>(
                withBasePath(basePath, item.manifestPath),
                controller.signal
              )
            )
          ),
          Promise.all(
            planisphereIndex.items.map((item: { manifestPath: string }) =>
              fetchJson<PlanisphereManifest>(
                withBasePath(basePath, item.manifestPath),
                controller.signal
              )
            )
          ),
        ]);

        setConstellations(
          constellationIndex.items.map((item, index) => ({
            ...item,
            ...constellationManifests[index],
          }))
        );
        setPlanispheres(
          planisphereIndex.items.map((item, index) => ({
            ...item,
            ...planisphereManifests[index],
          }))
        );
        setCanonicalTargets(targetIndex.items);
        setLoading(false);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Failed to load generated chart data.');
        setLoading(false);
      }
    }

    loadWorkbenchData();

    return () => {
      controller.abort();
    };
  }, [basePath]);

  return (
    <div className="workbench">
      <section className="panel" id="targets">
        <div className="section-heading">
          <span className="section-label">Pinned targets</span>
          <h2>Keep important Messier objects visible while you browse</h2>
          <p>
            This MVP keeps forced inclusion narrow and explicit: pin a small Messier list, then use the same selection to sort constellation charts and check planisphere compatibility.
          </p>
        </div>
        {loading ? (
          <p className="muted">Loading generated chart data…</p>
        ) : loadError ? (
          <p className="muted">{loadError}</p>
        ) : (
          <ForcedTargetInput
            canonicalTargets={canonicalTargets}
            selectedTargetIds={selectedTargetIds}
            onChange={setSelectedTargetIds}
          />
        )}
      </section>

      <section className="workbench__grid">
        <div className="panel">
          <div className="section-heading">
            <span className="section-label">Constellations</span>
            <h2 id="constellations">Browse all 88 printable constellation charts</h2>
            <p>
              Every constellation ships with a manifest, a vector thumbnail preview, and a letter-sized PDF built from real star, Messier, and IAU boundary data.
            </p>
          </div>
          {loading ? (
            <p className="muted">Loading constellation manifests…</p>
          ) : loadError ? (
            <p className="muted">{loadError}</p>
          ) : (
            <ConstellationBrowser
              constellations={constellations}
              selectedTargetIds={selectedTargetIds}
              basePath={basePath}
            />
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <span className="section-label">Planisphere</span>
            <h2 id="planisphere">Resolve a locality-specific planisphere book</h2>
            <p>
              Enter latitude, longitude, and timezone to resolve the nearest supported static artifact. The resulting PDF is a 50-page book with cover, instructions, and 48 LST pages.
            </p>
          </div>
          {loading ? (
            <p className="muted">Loading planisphere manifests…</p>
          ) : loadError ? (
            <p className="muted">{loadError}</p>
          ) : (
            <PlanisphereForm
              planispheres={planispheres}
              canonicalTargets={canonicalTargets}
              selectedTargetIds={selectedTargetIds}
              basePath={basePath}
            />
          )}
        </div>
      </section>

      <section className="panel" id="workflow">
        <div className="section-heading">
          <span className="section-label">MVP architecture</span>
          <h2>Static site shell, generated artifacts, field-first output</h2>
          <p>
            The site stays clearly separate from the astronomy pipeline. It consumes generated manifests, previews, and PDFs while preserving a print-first UI and a strict red-on-black night theme.
          </p>
        </div>
        <div className="workflow-grid">
          <article className="workflow-step">
            <strong>{loading ? '…' : constellations.length} constellation artifacts</strong>
            <p>Each chart includes dotted boundary guidance, subtle stick lines, Messier summaries, and a printable PDF path.</p>
          </article>
          <article className="workflow-step">
            <strong>{loading ? '…' : latitudeBands.length} latitude bands</strong>
            <p>Planisphere books resolve against supported latitude bands and UTC offset families while keeping the website fully static.</p>
          </article>
          <article className="workflow-step">
            <strong>{loading ? '…' : canonicalTargets.length} canonical Messier targets</strong>
            <p>Forced inclusion stays reviewable by normalizing against a shared target catalog instead of free-form chart logic in the site.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
