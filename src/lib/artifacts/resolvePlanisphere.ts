import type { LoadedPlanisphere } from './loadPlanispheres';

export interface PlanisphereResolution {
  artifact: LoadedPlanisphere;
  requestedLatitude: number;
  requestedLongitude: number;
  requestedTimeZone: string;
  requestedDate: string;
  requestedUtcOffsetMinutes: number;
  latitudeDelta: number;
  offsetDeltaMinutes: number;
  longitudeCorrectionMinutes: number;
}

export const COMMON_TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function formatOffsetLabel(minutes: number) {
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mins = String(absolute % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

export function getTimeZoneOffsetMinutes(timeZone: string, date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const part = formatter.formatToParts(date).find((entry) => entry.type === 'timeZoneName')?.value;
    if (!part) {
      return null;
    }
    const normalized = part.replace('GMT', '');
    if (!normalized) {
      return 0;
    }
    const match = normalized.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      return null;
    }
    const [, sign, rawHours, rawMinutes = '00'] = match;
    const absolute = Number(rawHours) * 60 + Number(rawMinutes);
    return sign === '-' ? -absolute : absolute;
  } catch {
    return null;
  }
}

function nearestValue(candidates: number[], target: number) {
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate - target) < Math.abs(closest - target) ? candidate : closest
  );
}

export function resolvePlanisphereArtifact(
  planispheres: LoadedPlanisphere[],
  latitude: number,
  longitude: number,
  timeZone: string,
  observingDate: Date,
  requestedDate: string
): PlanisphereResolution | null {
  const requestedUtcOffsetMinutes = getTimeZoneOffsetMinutes(timeZone, observingDate);
  if (requestedUtcOffsetMinutes === null) {
    return null;
  }

  const latitudeBands = [...new Set(planispheres.map((artifact) => artifact.latitudeBand))].sort((left, right) => left - right);
  const utcOffsets = [...new Set(planispheres.map((artifact) => artifact.utcOffsetMinutes))].sort((left, right) => left - right);
  const nearestLatitude = nearestValue(latitudeBands, latitude);
  const nearestOffset = nearestValue(utcOffsets, requestedUtcOffsetMinutes);

  const artifact = planispheres.find(
    (candidate) =>
      candidate.latitudeBand === nearestLatitude &&
      candidate.utcOffsetMinutes === nearestOffset
  );

  if (!artifact) {
    return null;
  }

  const standardMeridian = (nearestOffset / 60) * 15;
  return {
    artifact,
    requestedLatitude: latitude,
    requestedLongitude: longitude,
    requestedTimeZone: timeZone,
    requestedDate,
    requestedUtcOffsetMinutes,
    latitudeDelta: nearestLatitude - latitude,
    offsetDeltaMinutes: nearestOffset - requestedUtcOffsetMinutes,
    longitudeCorrectionMinutes: Math.round((longitude - standardMeridian) * 4),
  };
}
