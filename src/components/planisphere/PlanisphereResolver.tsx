import { useState } from 'react';

import type { LoadedPlanisphere } from '@/lib/artifacts/loadPlanispheres';
import { resolveForcedTargets } from '@/lib/artifacts/resolveForcedTargets';
import {
  COMMON_TIMEZONES,
  formatOffsetLabel,
  resolvePlanisphereArtifact,
} from '@/lib/artifacts/resolvePlanisphere';
import type { CanonicalTarget } from '@/lib/artifacts/types';
import { usePinnedTargets } from '@/lib/usePinnedTargets';
import { withBasePath } from '@/lib/site';

interface Props {
  planispheres: LoadedPlanisphere[];
  canonicalTargets: CanonicalTarget[];
  basePath: string;
}

function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseObservingDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  const day = Number(rawDay);
  const parsed = new Date(Date.UTC(year, monthIndex, day, 12));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  )
    return null;
  return parsed;
}

export default function PlanisphereResolver({ planispheres, canonicalTargets, basePath }: Props) {
  const { targetIds } = usePinnedTargets();
  const [latitude, setLatitude] = useState('37.5');
  const [longitude, setLongitude] = useState('-122.0');
  const [timeZone, setTimeZone] = useState('America/Los_Angeles');
  const [observingDate, setObservingDate] = useState(() => formatDateInputValue());

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const observingDateValue = parseObservingDate(observingDate);
  const hasNumericLocation =
    Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

  const resolution =
    hasNumericLocation &&
    observingDateValue &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
      ? resolvePlanisphereArtifact(
          planispheres,
          parsedLatitude,
          parsedLongitude,
          timeZone,
          observingDateValue,
          observingDate
        )
      : null;

  const targetCompatibility = resolution
    ? resolveForcedTargets(targetIds, canonicalTargets, resolution.artifact.supportedForcedTargets)
    : null;

  return (
    <div className="resolver">
      <div className="resolver__form">
        <div className="resolver__grid">
          <div className="field">
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              type="number"
              inputMode="decimal"
              min="-90"
              max="90"
              step="0.1"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              type="number"
              inputMode="decimal"
              min="-180"
              max="180"
              step="0.1"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="timezone">Time zone</label>
            <input
              id="timezone"
              list="timezone-options"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
            />
            <datalist id="timezone-options">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="observing-date">Observing date</label>
            <input
              id="observing-date"
              type="date"
              value={observingDate}
              onChange={(e) => setObservingDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {!resolution ? (
        <div className="resolver__empty">
          <p className="muted">
            Enter a valid latitude (−90 to 90), longitude (−180 to 180), IANA timezone, and
            observing date to resolve the nearest supported planisphere artifact.
          </p>
        </div>
      ) : (
        <div className="resolver__result">
          <div className="resolver__preview">
            {resolution.artifact.files.thumbnailSvg ? (
              <img
                src={withBasePath(basePath, resolution.artifact.files.thumbnailSvg)}
                alt="Planisphere preview"
              />
            ) : (
              <div className="resolver__preview-empty">Preview unavailable</div>
            )}
          </div>
          <div className="resolver__result-body">
            <div>
              <h2 className="resolver__result-title">
                {resolution.artifact.locationModel.latitudeBand >= 0 ? 'Northern' : 'Southern'}{' '}
                {Math.abs(resolution.artifact.locationModel.latitudeBand)}° planisphere
              </h2>
              <p className="muted">
                {resolution.artifact.page.pageCount} pages — 48 LST pages plus cover and
                instructions.
              </p>
            </div>

            <dl className="resolver__data">
              <div className="resolver__data-item">
                <dt>Resolved latitude</dt>
                <dd>{resolution.artifact.locationModel.latitudeBand}°</dd>
              </div>
              <div className="resolver__data-item">
                <dt>UTC offset</dt>
                <dd>{formatOffsetLabel(resolution.artifact.locationModel.utcOffsetMinutes)}</dd>
              </div>
              <div className="resolver__data-item">
                <dt>Observing date</dt>
                <dd>{resolution.requestedDate}</dd>
              </div>
              <div className="resolver__data-item">
                <dt>Page size</dt>
                <dd>{resolution.artifact.page.size.toUpperCase()}</dd>
              </div>
              <div className="resolver__data-item">
                <dt>Latitude adjustment</dt>
                <dd>
                  {resolution.latitudeDelta >= 0 ? '+' : ''}
                  {resolution.latitudeDelta.toFixed(1)}°
                </dd>
              </div>
              <div className="resolver__data-item">
                <dt>Offset adjustment</dt>
                <dd>
                  {resolution.offsetDeltaMinutes >= 0 ? '+' : ''}
                  {resolution.offsetDeltaMinutes} min
                </dd>
              </div>
              <div className="resolver__data-item">
                <dt>Longitude correction</dt>
                <dd>
                  {resolution.longitudeCorrectionMinutes >= 0 ? '+' : ''}
                  {resolution.longitudeCorrectionMinutes} min
                </dd>
              </div>
            </dl>

            {(targetCompatibility?.supported.length ||
              targetCompatibility?.unsupported.length) && (
              <div className="tag-row">
                {targetCompatibility.supported.map((t) => (
                  <span key={t.normalizedId} className="tag tag--accent">
                    {t.matchedLabel} ✓
                  </span>
                ))}
                {targetCompatibility.unsupported.map((t) => (
                  <span key={`${t.input}-${t.reason}`} className="tag">
                    {t.input}{' '}
                    {t.reason === 'unsupported-by-artifact' ? '(not in artifact)' : '(unknown)'}
                  </span>
                ))}
              </div>
            )}

            <div className="btn-row">
              <a
                className="btn"
                href={withBasePath(basePath, resolution.artifact.files.pdf)}
                target="_blank"
                rel="noreferrer"
              >
                Download planisphere PDF
              </a>
              <a
                className="btn--ghost"
                href={withBasePath(basePath, resolution.artifact.manifestPath)}
                target="_blank"
                rel="noreferrer"
              >
                View manifest
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
