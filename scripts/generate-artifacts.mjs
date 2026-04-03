import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { loadCatalogData } from '../src/lib/chart-core/data.js';
import { createConstellationArtifacts, createPlanispherePdf, createPlanispherePreview } from '../src/lib/chart-core/render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_ROOT = path.join(ROOT, 'site-public', 'generated');
const CONSTELLATION_ROOT = path.join(GENERATED_ROOT, 'constellations');
const PLANISPHERE_ROOT = path.join(GENERATED_ROOT, 'planispheres');
const TARGET_ROOT = path.join(GENERATED_ROOT, 'targets');
const SUPPORTED_OFFSETS = Array.from({ length: 53 }, (_, index) => -720 + index * 30);
const LATITUDE_BANDS = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
const PLANISPHERE_TARGETS = ['m13', 'm31', 'm42', 'm45', 'm51', 'm57', 'm81', 'm82', 'm104'];
const GENERATED_AT = process.env.GENERATED_AT ?? new Date().toISOString();

function hemisphereBias(polygons) {
  const points = polygons.flat();
  const averageDeclination = points.reduce((total, point) => total + point.decDeg, 0) / points.length;
  if (averageDeclination > 18) return 'northern';
  if (averageDeclination < -18) return 'southern';
  return 'equatorial';
}

function seasonsForRightAscension(displayCenterRaDeg) {
  const hours = displayCenterRaDeg / 15;
  if (hours >= 21 || hours < 3) return ['autumn'];
  if (hours < 9) return ['winter'];
  if (hours < 15) return ['spring'];
  return ['summer'];
}

function pageOrientationForBounds(polygons) {
  const points = polygons.flat();
  const raValues = points.map((point) => point.raDeg).sort((left, right) => left - right);
  const decValues = points.map((point) => point.decDeg);
  const wrapGap = raValues[0] + 360 - raValues[raValues.length - 1];
  const consecutiveGaps = raValues.slice(1).map((value, index) => value - raValues[index]);
  const width = 360 - Math.max(...consecutiveGaps, wrapGap);
  const height = Math.max(...decValues) - Math.min(...decValues);
  return height >= width ? 'portrait' : 'landscape';
}

function formatOffsetLabel(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const mins = String(absolute % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${mins}`;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function smallestSignedAngleDifference(degrees, referenceDegrees) {
  const wrappedDifference = ((degrees - referenceDegrees + 540) % 360) - 180;
  return wrappedDifference === -180 ? 180 : wrappedDifference;
}

async function ensureDir(directory) {
  await mkdir(directory, { recursive: true });
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function main() {
  await rm(GENERATED_ROOT, { recursive: true, force: true });
  await ensureDir(CONSTELLATION_ROOT);
  await ensureDir(PLANISPHERE_ROOT);
  await ensureDir(TARGET_ROOT);

  const { stars, messierObjects, constellations, constellationBounds } = await loadCatalogData();

  const constellationIndex = {
    schemaVersion: '1',
    generatedAt: GENERATED_AT,
    items: [],
  };

  for (const constellation of constellations) {
    const polygons = constellationBounds.get(constellation.id);
    if (!polygons?.length) {
      console.warn(
        `Skipping constellation ${constellation.id} (${constellation.name}, ${constellation.iauCode}): no polygons or bounds found.`,
      );
      continue;
    }

    const directory = path.join(CONSTELLATION_ROOT, constellation.id.toLowerCase());
    await ensureDir(directory);

    const preferredOrientation = pageOrientationForBounds(polygons);
    const artifacts = createConstellationArtifacts(constellation, polygons, stars, messierObjects);
    if (preferredOrientation !== 'portrait') {
      console.warn(
        `Constellation ${constellation.id} (${constellation.name}) prefers ${preferredOrientation}, but createConstellationArtifacts currently renders a fixed portrait PDF; manifest remains portrait until landscape output is implemented.`,
      );
    }
    const centerDecRadians = toRadians(constellation.displayCenterDecDeg);
    const maxDistanceDeg = Math.max(
      ...polygons.flat().map((point) => {
        const deltaDec = point.decDeg - constellation.displayCenterDecDeg;
        const deltaRa =
          smallestSignedAngleDifference(point.raDeg, constellation.displayCenterRaDeg) *
          Math.cos(centerDecRadians);
        return Math.hypot(deltaDec, deltaRa);
      }),
    );
    const manifest = {
      schemaVersion: '1',
      artifactType: 'constellation-chart',
      id: constellation.id.toLowerCase(),
      iauCode: constellation.iauCode,
      slug: constellation.slug,
      name: constellation.name,
      title: constellation.name,
      version: '2026.03-real',
      generatedAt: GENERATED_AT,
      page: {
        size: 'letter',
        orientation: 'portrait',
      },
      coverage: {
        centerRaHours: Number((constellation.displayCenterRaDeg / 15).toFixed(2)),
        centerDecDeg: Number(constellation.displayCenterDecDeg.toFixed(2)),
        radiusDeg: Number((maxDistanceDeg + 8).toFixed(1)),
      },
      counts: {
        stars: artifacts.stats.stars,
        messier: artifacts.stats.messier,
        forcedTargets: 0,
      },
      features: {
        iauBoundaries: true,
        cardinalMarkers: false,
      },
      files: {
        pdf: `/generated/constellations/${constellation.id.toLowerCase()}/chart.pdf`,
        thumbnailSvg: `/generated/constellations/${constellation.id.toLowerCase()}/thumb.svg`,
      },
      includedTargets: artifacts.includedTargets,
    };

    constellationIndex.items.push({
      id: constellation.id.toLowerCase(),
      iauCode: constellation.iauCode,
      slug: constellation.slug,
      name: constellation.name,
      hemisphereBias: hemisphereBias(polygons),
      seasons: seasonsForRightAscension(constellation.displayCenterRaDeg),
      manifestPath: `/generated/constellations/${constellation.id.toLowerCase()}/manifest.json`,
    });

    await writeJson(path.join(directory, 'manifest.json'), manifest);
    await writeFile(path.join(directory, 'thumb.svg'), artifacts.svg, 'utf8');
    await writeFile(path.join(directory, 'chart.pdf'), artifacts.pdf);
  }

  constellationIndex.items.sort((left, right) => left.name.localeCompare(right.name));
  await writeJson(path.join(CONSTELLATION_ROOT, 'index.json'), constellationIndex);

  const targets = messierObjects
    .map((object) => ({
      id: object.id,
      label: object.label,
      aliases: object.altName ? [object.altName.toLowerCase()] : [],
      type: 'messier',
    }))
    .sort((left, right) => Number(left.label.slice(1)) - Number(right.label.slice(1)));
  await writeJson(path.join(TARGET_ROOT, 'index.json'), {
    schemaVersion: '1',
    generatedAt: GENERATED_AT,
    items: targets,
  });

  const planisphereIndex = {
    schemaVersion: '1',
    generatedAt: GENERATED_AT,
    items: [],
  };

  for (const latitudeBand of LATITUDE_BANDS) {
    const latitudeSlug = latitudeBand >= 0 ? `p${latitudeBand}` : `m${Math.abs(latitudeBand)}`;
    const bandDirectory = path.join(PLANISPHERE_ROOT, `lat_${latitudeSlug}`);
    await ensureDir(bandDirectory);
    await writeFile(path.join(bandDirectory, 'thumb.svg'), createPlanispherePreview(latitudeBand, stars, messierObjects), 'utf8');
    await writeFile(path.join(bandDirectory, 'book.pdf'), createPlanispherePdf(latitudeBand, stars, messierObjects));

    for (const utcOffsetMinutes of SUPPORTED_OFFSETS) {
      const planisphereId = `lat_${latitudeSlug}_utc_${utcOffsetMinutes >= 0 ? `p${utcOffsetMinutes}` : `m${Math.abs(utcOffsetMinutes)}`}`;
      const manifestDirectory = path.join(bandDirectory, planisphereId);
      await ensureDir(manifestDirectory);

      const manifest = {
        schemaVersion: '1',
        artifactType: 'planisphere-book',
        id: planisphereId,
        version: '2026.03-real',
        generatedAt: GENERATED_AT,
        locationModel: {
          latitudeBand,
          utcOffsetMinutes,
          timezoneLabel: formatOffsetLabel(utcOffsetMinutes),
          resolutionPolicy: 'nearest-supported',
        },
        page: {
          size: 'letter',
          orientation: 'portrait',
          pageCount: 50,
        },
        files: {
          pdf: `/generated/planispheres/lat_${latitudeSlug}/book.pdf`,
          thumbnailSvg: `/generated/planispheres/lat_${latitudeSlug}/thumb.svg`,
        },
        supportedForcedTargets: PLANISPHERE_TARGETS,
      };

      await writeJson(path.join(manifestDirectory, 'manifest.json'), manifest);
      planisphereIndex.items.push({
        id: planisphereId,
        latitudeBand,
        utcOffsetMinutes,
        timezoneLabel: manifest.locationModel.timezoneLabel,
        manifestPath: `/generated/planispheres/lat_${latitudeSlug}/${planisphereId}/manifest.json`,
      });
    }
  }

  await writeJson(path.join(PLANISPHERE_ROOT, 'index.json'), planisphereIndex);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
