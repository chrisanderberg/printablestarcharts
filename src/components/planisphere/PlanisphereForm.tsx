import { useState } from 'react';

import type { LoadedPlanisphere } from '@/lib/artifacts/loadPlanispheres';
import { resolveForcedTargets } from '@/lib/artifacts/resolveForcedTargets';
import {
  COMMON_TIMEZONES,
  formatOffsetLabel,
  resolvePlanisphereArtifact,
} from '@/lib/artifacts/resolvePlanisphere';
import type { CanonicalTarget } from '@/lib/artifacts/types';
import { withBasePath } from '@/lib/site';

interface Props {
  planispheres: LoadedPlanisphere[];
  canonicalTargets: CanonicalTarget[];
  selectedTargetIds: string[];
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
  if (!match) {
    return null;
  }

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  const day = Number(rawDay);
  const parsed = new Date(Date.UTC(year, monthIndex, day, 12));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== monthIndex ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export default function PlanisphereForm({
  planispheres,
  canonicalTargets,
  selectedTargetIds,
  basePath,
}: Props) {
  const [latitude, setLatitude] = useState('37.5');
  const [longitude, setLongitude] = useState('-122.0');
  const [timeZone, setTimeZone] = useState('America/Los_Angeles');
  const [observingDate, setObservingDate] = useState(() => formatDateInputValue());

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);
  const observingDateValue = parseObservingDate(observingDate);
  const hasNumericLocation = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const resolution =
    hasNumericLocation &&
    observingDateValue &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
      ? resolvePlanisphereArtifact(planispheres, parsedLatitude, parsedLongitude, timeZone, observingDateValue, observingDate)
      : null;

  const targetCompatibility = resolution
    ? resolveForcedTargets(selectedTargetIds, canonicalTargets, resolution.artifact.supportedForcedTargets)
    : null;

  return (
    <div className="planisphere-shell">
      <div className="planisphere-form__grid">
        <div className="planisphere-field">
          <label htmlFor="latitude">Latitude</label>
          <input
            id="latitude"
            type="number"
            inputMode="decimal"
            min="-90"
            max="90"
            step="0.1"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </div>
        <div className="planisphere-field">
          <label htmlFor="longitude">Longitude</label>
          <input
            id="longitude"
            type="number"
            inputMode="decimal"
            min="-180"
            max="180"
            step="0.1"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </div>
        <div className="planisphere-field">
          <label htmlFor="timezone">Time zone</label>
          <input
            id="timezone"
            list="timezone-options"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
          />
          <datalist id="timezone-options">
            {COMMON_TIMEZONES.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
        </div>
        <div className="planisphere-field">
          <label htmlFor="observing-date">Observing date</label>
          <input
            id="observing-date"
            type="date"
            value={observingDate}
            onChange={(event) => setObservingDate(event.target.value)}
          />
        </div>
      </div>

      {!resolution ? (
        <div className="panel panel--dense">
          <p className="muted">
            Enter a valid latitude, longitude, IANA timezone, and observing date to resolve the nearest supported book-style planisphere artifact.
          </p>
        </div>
      ) : (
        <article className="planisphere-result">
          <div className="planisphere-result__preview">
            {resolution.artifact.files.thumbnailSvg ? (
              <img
                src={withBasePath(basePath, resolution.artifact.files.thumbnailSvg)}
                alt="Planisphere preview"
              />
            ) : (
              <div className="planisphere-result__empty">Preview unavailable</div>
            )}
          </div>
          <div className="planisphere-result__body">
            <div>
              <h3>
                {resolution.artifact.locationModel.latitudeBand >= 0 ? 'Northern' : 'Southern'}{' '}
                {Math.abs(resolution.artifact.locationModel.latitudeBand)}° planisphere book
              </h3>
              <p className="muted">
                48 LST pages plus cover and instructions, resolved using your observing date for the nearest supported UTC offset family.
              </p>
            </div>

            <div className="planisphere-result__meta">
              <span className="pill">Resolved latitude {resolution.artifact.locationModel.latitudeBand}°</span>
              <span className="pill">{formatOffsetLabel(resolution.artifact.locationModel.utcOffsetMinutes)}</span>
              <span className="pill">{resolution.requestedDate}</span>
              <span className="pill">{resolution.artifact.page.pageCount} pages</span>
              <span className="pill">{resolution.artifact.page.size.toUpperCase()} PDF</span>
            </div>

            <div className="panel panel--dense">
              <p className="muted">
                Latitude adjustment: {resolution.latitudeDelta >= 0 ? '+' : ''}
                {resolution.latitudeDelta.toFixed(1)}°. Offset adjustment: {resolution.offsetDeltaMinutes >= 0 ? '+' : ''}
                {resolution.offsetDeltaMinutes} minutes. Solar clock correction from longitude: {resolution.longitudeCorrectionMinutes >= 0 ? '+' : ''}
                {resolution.longitudeCorrectionMinutes} minutes.
              </p>
            </div>

            <div className="chip-row">
              {targetCompatibility?.supported.length ? (
                targetCompatibility.supported.map((target) => (
                  <span key={target.normalizedId} className="target-chip">
                    {target.matchedLabel} supported
                  </span>
                ))
              ) : (
                <span className="pill">No pinned targets matched this artifact yet</span>
              )}
              {targetCompatibility?.unsupported.map((target) => (
                <span key={`${target.input}-${target.reason}`} className="pill">
                  {target.input} {target.reason === 'unsupported-by-artifact' ? 'not in this artifact' : 'unknown'}
                </span>
              ))}
            </div>

            <div className="planisphere-actions">
              <a className="button" href={withBasePath(basePath, resolution.artifact.files.pdf)} target="_blank" rel="noreferrer">
                Open planisphere PDF
              </a>
              <a
                className="button--ghost"
                href={withBasePath(basePath, resolution.artifact.manifestPath)}
                target="_blank"
                rel="noreferrer"
              >
                Manifest
              </a>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
