import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadCatalogData } from '../src/lib/chart-core/data.js';
import { createConstellationArtifacts, createPlanispherePdf, createPlanispherePreview } from '../src/lib/chart-core/render.js';

const ROOT = process.cwd();
const GENERATED_ROOT = path.join(ROOT, 'site-public', 'generated');
const CONSTELLATION_ROOT = path.join(GENERATED_ROOT, 'constellations');
const PLANISPHERE_ROOT = path.join(GENERATED_ROOT, 'planispheres');
const TARGET_ROOT = path.join(GENERATED_ROOT, 'targets');
const SUPPORTED_OFFSETS = Array.from({ length: 53 }, (_, index) => -720 + index * 30);
const LATITUDE_BANDS = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
const PLANISPHERE_TARGETS = ['m13', 'm31', 'm42', 'm45', 'm51', 'm57', 'm81', 'm82', 'm104'];

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
  const raValues = points.map((point) => point.raDeg);
  const decValues = points.map((point) => point.decDeg);
  const width = Math.max(...raValues) - Math.min(...raValues);
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
    generatedAt: '2026-03-31T00:00:00Z',
    items: [],
  };

  for (const constellation of constellations) {
    const polygons = constellationBounds.get(constellation.iauCode);
    if (!polygons?.length) {
      continue;
    }

    const directory = path.join(CONSTELLATION_ROOT, constellation.id.toLowerCase());
    await ensureDir(directory);

    const artifacts = createConstellationArtifacts(constellation, polygons, stars, messierObjects);
    const manifest = {
      schemaVersion: '1',
      artifactType: 'constellation-chart',
      id: constellation.id.toLowerCase(),
      iauCode: constellation.iauCode,
      slug: constellation.slug,
      name: constellation.name,
      title: constellation.name,
      version: '2026.03-real',
      generatedAt: '2026-03-31T00:00:00Z',
      page: {
        size: 'letter',
        orientation: pageOrientationForBounds(polygons),
      },
      coverage: {
        centerRaHours: Number((constellation.displayCenterRaDeg / 15).toFixed(2)),
        centerDecDeg: Number(constellation.displayCenterDecDeg.toFixed(2)),
        radiusDeg: Number((Math.max(...polygons.flat().map((point) => Math.abs(point.decDeg - constellation.displayCenterDecDeg))) + 8).toFixed(1)),
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
    await writeFile(path.join(directory, 'chart.pdf'), artifacts.pdf, 'utf8');
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
    generatedAt: '2026-03-31T00:00:00Z',
    items: targets,
  });

  const planisphereIndex = {
    schemaVersion: '1',
    generatedAt: '2026-03-31T00:00:00Z',
    items: [],
  };

  for (const latitudeBand of LATITUDE_BANDS) {
    const latitudeSlug = latitudeBand >= 0 ? `p${latitudeBand}` : `m${Math.abs(latitudeBand)}`;
    const bandDirectory = path.join(PLANISPHERE_ROOT, `lat_${latitudeSlug}`);
    await ensureDir(bandDirectory);
    await writeFile(path.join(bandDirectory, 'thumb.svg'), createPlanispherePreview(latitudeBand, stars, messierObjects), 'utf8');
    await writeFile(path.join(bandDirectory, 'book.pdf'), createPlanispherePdf(latitudeBand, stars, messierObjects), 'utf8');

    for (const utcOffsetMinutes of SUPPORTED_OFFSETS) {
      const planisphereId = `lat_${latitudeSlug}_utc_${utcOffsetMinutes >= 0 ? `p${utcOffsetMinutes}` : `m${Math.abs(utcOffsetMinutes)}`}`;
      const manifestDirectory = path.join(bandDirectory, planisphereId);
      await ensureDir(manifestDirectory);

      const manifest = {
        schemaVersion: '1',
        artifactType: 'planisphere-book',
        id: planisphereId,
        version: '2026.03-real',
        generatedAt: '2026-03-31T00:00:00Z',
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
