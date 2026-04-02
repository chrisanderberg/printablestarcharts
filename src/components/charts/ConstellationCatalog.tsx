import { useState } from 'react';

import type { LoadedConstellation } from '@/lib/artifacts/loadConstellations';
import type { Season } from '@/lib/artifacts/types';
import { usePinnedTargets } from '@/lib/usePinnedTargets';
import { withBasePath } from '@/lib/site';

interface Props {
  constellations: LoadedConstellation[];
  basePath: string;
}

export default function ConstellationCatalog({ constellations, basePath }: Props) {
  const { targetIds } = usePinnedTargets();
  const [query, setQuery] = useState('');
  const [hemisphere, setHemisphere] = useState('all');
  const [season, setSeason] = useState('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const selectedSet = new Set(targetIds);

  const filtered = constellations
    .filter((c) => {
      if (hemisphere !== 'all' && c.hemisphereBias !== hemisphere) return false;
      if (season !== 'all' && !c.seasons.includes(season as Season)) return false;
      if (
        normalizedQuery &&
        !`${c.name} ${c.iauCode} ${c.slug}`.toLowerCase().includes(normalizedQuery)
      )
        return false;
      const hasPinned = c.includedTargets.some((t) => selectedSet.has(t.id));
      if (showPinnedOnly && targetIds.length && !hasPinned) return false;
      return true;
    })
    .sort((a, b) => {
      const aMatches = a.includedTargets.filter((t) => selectedSet.has(t.id)).length;
      const bMatches = b.includedTargets.filter((t) => selectedSet.has(t.id)).length;
      if (bMatches !== aMatches) return bMatches - aMatches;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="catalog">
      <div className="catalog__controls">
        <input
          className="catalog__search"
          type="search"
          value={query}
          placeholder="Search constellations…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search constellations"
        />
        <select
          className="catalog__filter"
          value={hemisphere}
          onChange={(e) => setHemisphere(e.target.value)}
          aria-label="Filter by hemisphere"
        >
          <option value="all">All skies</option>
          <option value="northern">Northern</option>
          <option value="equatorial">Equatorial</option>
          <option value="southern">Southern</option>
        </select>
        <select
          className="catalog__filter"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          aria-label="Filter by season"
        >
          <option value="all">All seasons</option>
          <option value="winter">Winter</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="year-round">Year-round</option>
        </select>
        {targetIds.length > 0 && (
          <button
            type="button"
            className="btn--ghost"
            onClick={() => setShowPinnedOnly((v) => !v)}
          >
            {showPinnedOnly ? 'Show all' : 'Show pinned matches'}
          </button>
        )}
      </div>

      <p className="catalog__summary feedback">
        {filtered.length} of {constellations.length} charts
      </p>

      <div className="constellation-grid">
        {filtered.map((c) => {
          const matchedTargets = c.includedTargets.filter((t) => selectedSet.has(t.id));
          const hasPinned = matchedTargets.length > 0;
          return (
            <a
              key={c.id}
              className="constellation-card"
              href={withBasePath(basePath, `constellations/${c.slug}/`)}
            >
              <div className="constellation-card__frame">
                {c.files.thumbnailSvg ? (
                  <img
                    src={withBasePath(basePath, c.files.thumbnailSvg)}
                    alt={`${c.name} chart preview`}
                    loading="lazy"
                  />
                ) : (
                  <div className="constellation-card__empty">No preview</div>
                )}
              </div>
              <div className="constellation-card__body">
                <div className="constellation-card__header">
                  <div>
                    <h3 className="constellation-card__name">{c.name}</h3>
                    <span className="mono muted constellation-card__code">{c.iauCode}</span>
                  </div>
                  {hasPinned && <span className="tag tag--accent">Pinned</span>}
                </div>
                <div className="tag-row">
                  <span className="tag">{c.hemisphereBias}</span>
                  {c.seasons.slice(0, 2).map((s) => (
                    <span key={s} className="tag">
                      {s}
                    </span>
                  ))}
                  {c.counts.messier > 0 && (
                    <span className="tag tag--accent">{c.counts.messier}M</span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
