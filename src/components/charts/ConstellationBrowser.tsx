import { useState } from 'react';

import type { LoadedConstellation } from '@/lib/artifacts/loadConstellations';
import { withBasePath } from '@/lib/site';

interface Props {
  constellations: LoadedConstellation[];
  selectedTargetIds: string[];
  basePath: string;
}

export default function ConstellationBrowser({
  constellations,
  selectedTargetIds,
  basePath,
}: Props) {
  const [query, setQuery] = useState('');
  const [hemisphere, setHemisphere] = useState('all');
  const [season, setSeason] = useState('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = constellations
    .filter((constellation) => {
      if (hemisphere !== 'all' && constellation.hemisphereBias !== hemisphere) {
        return false;
      }
      if (season !== 'all' && !constellation.seasons.includes(season as never)) {
        return false;
      }
      if (
        normalizedQuery &&
        !`${constellation.name} ${constellation.iauCode} ${constellation.slug}`
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }
      const hasPinnedMatch = constellation.includedTargets.some((target) => selectedTargetIds.includes(target.id));
      if (showPinnedOnly && selectedTargetIds.length && !hasPinnedMatch) {
        return false;
      }
      return true;
    })
    .sort((left, right) => {
      const leftMatches = left.includedTargets.filter((target) => selectedTargetIds.includes(target.id)).length;
      const rightMatches = right.includedTargets.filter((target) => selectedTargetIds.includes(target.id)).length;
      if (rightMatches !== leftMatches) {
        return rightMatches - leftMatches;
      }
      return left.name.localeCompare(right.name);
    });

  return (
    <div className="browser-shell">
      <div className="browser-controls">
        <input
          className="browser-input"
          type="search"
          value={query}
          placeholder="Search by name, abbreviation, or slug"
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="browser-select" value={hemisphere} onChange={(event) => setHemisphere(event.target.value)}>
          <option value="all">All skies</option>
          <option value="northern">Northern bias</option>
          <option value="equatorial">Equatorial</option>
          <option value="southern">Southern bias</option>
        </select>
        <select className="browser-select" value={season} onChange={(event) => setSeason(event.target.value)}>
          <option value="all">All seasons</option>
          <option value="winter">Winter</option>
          <option value="spring">Spring</option>
          <option value="summer">Summer</option>
          <option value="autumn">Autumn</option>
          <option value="year-round">Year-round</option>
        </select>
        <button type="button" className="button--ghost" onClick={() => setShowPinnedOnly((current) => !current)}>
          {showPinnedOnly ? 'Show all charts' : 'Show pinned matches'}
        </button>
      </div>

      <p className="browser-summary">
        {filtered.length} charts visible. All 88 IAU constellations are available as print-first PDF exports.
      </p>

      <div className="constellation-grid">
        {filtered.map((constellation) => {
          const matchedTargets = constellation.includedTargets.filter((target) => selectedTargetIds.includes(target.id));
          return (
            <article key={constellation.id} className="constellation-card">
              <div className="constellation-card__image">
                <img
                  src={withBasePath(basePath, constellation.files.thumbnailSvg ?? '')}
                  alt={`${constellation.name} preview`}
                  loading="lazy"
                />
              </div>
              <div className="constellation-card__body">
                <div className="constellation-card__title">
                  <div>
                    <h3>{constellation.name}</h3>
                    <p className="muted">{constellation.iauCode} constellation chart</p>
                  </div>
                  {matchedTargets.length ? <span className="pill pill--accent">Pinned match</span> : null}
                </div>

                <div className="constellation-card__meta">
                  <span className="pill">{constellation.hemisphereBias}</span>
                  {constellation.seasons.map((entry) => (
                    <span key={entry} className="pill">
                      {entry}
                    </span>
                  ))}
                  <span className="pill">{constellation.counts.stars} stars</span>
                  <span className="pill">{constellation.counts.messier} Messier</span>
                </div>

                <div className="constellation-card__targets">
                  {constellation.includedTargets.length ? (
                    constellation.includedTargets.slice(0, 5).map((target) => (
                      <span
                        key={target.id}
                        className={`pill ${selectedTargetIds.includes(target.id) ? 'pill--accent' : ''}`}
                      >
                        {target.label}
                      </span>
                    ))
                  ) : (
                    <span className="pill">No Messier highlights</span>
                  )}
                </div>

                <div className="button-row">
                  <a className="button" href={withBasePath(basePath, constellation.files.pdf)} target="_blank" rel="noreferrer">
                    Open PDF
                  </a>
                  <a
                    className="button--ghost"
                    href={withBasePath(basePath, constellation.manifestPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Manifest
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
