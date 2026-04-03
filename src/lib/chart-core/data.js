import { readFile } from 'node:fs/promises';
import path from 'node:path';

function dataPath(fileName) {
  return path.join(process.cwd(), 'node_modules', 'd3-celestial', 'data', fileName);
}

async function readJson(fileName) {
  return JSON.parse(await readFile(dataPath(fileName), 'utf8'));
}

function toRaDegrees(longitude) {
  return longitude < 0 ? longitude + 360 : longitude;
}

function transliterateGreekLetter(value) {
  const mapping = new Map([
    ['α', 'alpha'],
    ['β', 'beta'],
    ['γ', 'gamma'],
    ['δ', 'delta'],
    ['ε', 'epsilon'],
    ['ζ', 'zeta'],
    ['η', 'eta'],
    ['θ', 'theta'],
    ['ι', 'iota'],
    ['κ', 'kappa'],
    ['λ', 'lambda'],
    ['μ', 'mu'],
    ['ν', 'nu'],
    ['ξ', 'xi'],
    ['ο', 'omicron'],
    ['π', 'pi'],
    ['ρ', 'rho'],
    ['σ', 'sigma'],
    ['τ', 'tau'],
    ['υ', 'upsilon'],
    ['φ', 'phi'],
    ['χ', 'chi'],
    ['ψ', 'psi'],
    ['ω', 'omega'],
  ]);

  const firstCharacter = value.trim().charAt(0);
  if (!mapping.has(firstCharacter)) {
    return value.trim();
  }

  const suffix = value.trim().slice(1);
  return `${mapping.get(firstCharacter)}${suffix}`.trim();
}

export async function loadCatalogData() {
  const [starsCollection, starNames, messierCollection, constellationCollection, boundaryCollection] =
    await Promise.all([
      readJson('stars.6.json'),
      readJson('starnames.json'),
      readJson('messier.json'),
      readJson('constellations.json'),
      readJson('constellations.bounds.json'),
    ]);

  const stars = starsCollection.features.map((feature) => {
    const hipId = String(feature.id);
    const starNameEntry = starNames[hipId] ?? {};
    const [longitude, latitude] = feature.geometry.coordinates;
    const designation = transliterateGreekLetter(starNameEntry.desig ?? '');
    const bayer = transliterateGreekLetter(starNameEntry.bayer ?? '');

    return {
      hipId,
      raDeg: toRaDegrees(longitude),
      decDeg: latitude,
      mag: feature.properties.mag,
      bv: feature.properties.bv ? Number(feature.properties.bv) : null,
      properName: starNameEntry.name?.trim() || '',
      designation,
      bayer,
      flamsteed: starNameEntry.flam?.trim() || '',
      variable: starNameEntry.var?.trim() || '',
      constellation: starNameEntry.c?.trim() || '',
    };
  });

  const messierObjects = messierCollection.features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return {
      id: feature.properties.name.toLowerCase(),
      label: feature.properties.name,
      raDeg: toRaDegrees(longitude),
      decDeg: latitude,
      type: feature.properties.type,
      magnitude: Number(feature.properties.mag),
      altName: feature.properties.alt ?? '',
      designation: feature.properties.desig ?? '',
    };
  });

  const constellationMap = new Map();
  for (const feature of constellationCollection.features) {
    if (constellationMap.has(feature.id)) {
      continue;
    }
    constellationMap.set(feature.id, {
      id: feature.id,
      slug: feature.properties.en.toLowerCase().replace(/\s+/g, '-'),
      name: feature.properties.en,
      iauCode: feature.properties.desig,
      displayCenterRaDeg: feature.properties.display?.[0] ?? toRaDegrees(feature.geometry.coordinates[0]),
      displayCenterDecDeg: feature.properties.display?.[1] ?? feature.geometry.coordinates[1],
      rank: Number(feature.properties.rank ?? 3),
      labelRaDeg: toRaDegrees(feature.geometry.coordinates[0]),
      labelDecDeg: feature.geometry.coordinates[1],
    });
  }

  const constellationBounds = new Map();
  for (const feature of boundaryCollection.features) {
    const polygons = constellationBounds.get(feature.id) ?? [];
    polygons.push(
      feature.geometry.coordinates[0].map(([longitude, latitude]) => ({
        raDeg: toRaDegrees(longitude),
        decDeg: latitude,
      }))
    );
    constellationBounds.set(feature.id, polygons);
  }

  return {
    stars,
    messierObjects,
    constellations: [...constellationMap.values()],
    constellationBounds,
  };
}
