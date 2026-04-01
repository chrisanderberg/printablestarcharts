import {
  approximateSolarRaDegrees,
  equatorialToHorizontal,
  localSiderealDegrees,
  pointInPolygon,
  polygonBounds,
  stereographicProject,
  unwrapRightAscension,
} from './geometry.js';
import { buildPdfDocument, circlePath, diamondPath, escapePdfText, rectanglePath } from './pdf.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function starRadius(magnitude) {
  return Math.max(0.9, 4.8 - magnitude * 0.58);
}

function dsoShape(type) {
  if (type === 'gc') {
    return 'circle-outline';
  }
  if (type === 'oc' || type === 'en' || type === 'bn' || type === 'sfr') {
    return 'square-outline';
  }
  if (type === 'pn' || type === 'snr') {
    return 'diamond-outline';
  }
  return 'ellipse-outline';
}

function drawDsoSvgMarkup(dso, x, y) {
  const shape = dsoShape(dso.type);
  if (shape === 'circle-outline') {
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.7" fill="none" stroke="#b21d18" stroke-width="1.4" />`;
  }
  if (shape === 'square-outline') {
    return `<rect x="${(x - 4.4).toFixed(1)}" y="${(y - 4.4).toFixed(1)}" width="8.8" height="8.8" fill="none" stroke="#b21d18" stroke-width="1.4" />`;
  }
  if (shape === 'diamond-outline') {
    return `<path d="M ${x.toFixed(1)} ${(y - 5.1).toFixed(1)} L ${(x + 5.1).toFixed(1)} ${y.toFixed(1)} L ${x.toFixed(1)} ${(y + 5.1).toFixed(1)} L ${(x - 5.1).toFixed(1)} ${y.toFixed(1)} Z" fill="none" stroke="#b21d18" stroke-width="1.4" />`;
  }
  return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.6" ry="4.1" fill="none" stroke="#b21d18" stroke-width="1.4" />`;
}

function pushDsoPdf(commands, dso, x, y) {
  const shape = dsoShape(dso.type);
  commands.push('0.70 0.12 0.10 RG');
  commands.push('0.9 w');
  if (shape === 'circle-outline') {
    commands.push(circlePath(x, y, 4.2));
    commands.push('S');
    return;
  }
  if (shape === 'square-outline') {
    commands.push(rectanglePath(x - 4.2, y - 4.2, 8.4, 8.4));
    commands.push('S');
    return;
  }
  if (shape === 'diamond-outline') {
    commands.push(diamondPath(x, y, 4.4));
    commands.push('S');
    return;
  }
  commands.push(`${(x - 6.2).toFixed(2)} ${y.toFixed(2)} m ${(x + 6.2).toFixed(2)} ${y.toFixed(2)} l S`);
  commands.push(`${x.toFixed(2)} ${(y - 4.1).toFixed(2)} m ${x.toFixed(2)} ${(y + 4.1).toFixed(2)} l S`);
}

function buildConstellationScene(constellation, polygons, stars, messierObjects) {
  const boundaries = polygons.map((polygon) => polygonBounds(polygon, constellation.displayCenterRaDeg));
  const combinedPoints = boundaries.flatMap((boundary) => boundary.points);
  const paddingX = Math.max(
    3.5,
    (Math.max(...boundaries.map((boundary) => boundary.maxX)) - Math.min(...boundaries.map((boundary) => boundary.minX))) * 0.18
  );
  const paddingY = Math.max(
    3.5,
    (Math.max(...boundaries.map((boundary) => boundary.maxY)) - Math.min(...boundaries.map((boundary) => boundary.minY))) * 0.18
  );
  const chartBounds = {
    minX: Math.min(...boundaries.map((boundary) => boundary.minX)) - paddingX,
    maxX: Math.max(...boundaries.map((boundary) => boundary.maxX)) + paddingX,
    minY: Math.min(...boundaries.map((boundary) => boundary.minY)) - paddingY,
    maxY: Math.max(...boundaries.map((boundary) => boundary.maxY)) + paddingY,
  };
  const widthDeg = Math.max(10, chartBounds.maxX - chartBounds.minX);
  const heightDeg = Math.max(10, chartBounds.maxY - chartBounds.minY);
  const aspect = widthDeg / heightDeg;
  const width = 760;
  const height = 760 / aspect;
  const margin = 54;

  const project = (raDeg, decDeg) => {
    const unwrappedRa = unwrapRightAscension(constellation.displayCenterRaDeg, raDeg);
    const x = margin + ((unwrappedRa - chartBounds.minX) / widthDeg) * (width - margin * 2);
    const y = height - margin - ((decDeg - chartBounds.minY) / heightDeg) * (height - margin * 2);
    return { x, y, unwrappedRa };
  };

  const boundaryPointGroups = boundaries.map((boundary) => boundary.points.map((point) => project(point.x, point.y)));

  const visibleStars = stars
    .map((star) => {
      const projected = project(star.raDeg, star.decDeg);
      return {
        ...star,
        x: projected.x,
        y: projected.y,
        unwrappedRa: projected.unwrappedRa,
      };
    })
    .filter(
      (star) =>
        star.unwrappedRa >= chartBounds.minX &&
        star.unwrappedRa <= chartBounds.maxX &&
        star.decDeg >= chartBounds.minY &&
        star.decDeg <= chartBounds.maxY
    )
    .sort((left, right) => left.mag - right.mag);

  const polygonOnly = boundaries.map((boundary) => boundary.points.map((point) => ({ x: point.x, y: point.y })));
  const starsInsideBoundary = visibleStars.filter((star) =>
    polygonOnly.some((polygon) => pointInPolygon({ x: star.unwrappedRa, y: star.decDeg }, polygon))
  );

  const labeledStars = visibleStars.filter(
    (star) =>
      (star.constellation === constellation.iauCode && ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].some((prefix) => star.designation.toLowerCase().startsWith(prefix))) ||
      star.mag <= 1.3
  );

  const visibleMessier = messierObjects
    .map((object) => {
      const projected = project(object.raDeg, object.decDeg);
      return {
        ...object,
        x: projected.x,
        y: projected.y,
        unwrappedRa: projected.unwrappedRa,
      };
    })
    .filter(
      (object) =>
        object.unwrappedRa >= chartBounds.minX &&
        object.unwrappedRa <= chartBounds.maxX &&
        object.decDeg >= chartBounds.minY &&
        object.decDeg <= chartBounds.maxY
    )
    .sort((left, right) => left.magnitude - right.magnitude);

  return {
    width,
    height,
    chartBounds,
    boundaryPointGroups,
    visibleStars,
    starsInsideBoundary,
    labeledStars,
    visibleMessier,
  };
}

export function createConstellationArtifacts(constellation, polygons, stars, messierObjects) {
  const scene = buildConstellationScene(constellation, polygons, stars, messierObjects);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">
  <rect width="${scene.width}" height="${scene.height}" rx="28" fill="#fffdf8"/>
  <rect x="16" y="16" width="${scene.width - 32}" height="${scene.height - 32}" rx="20" fill="none" stroke="#171412" stroke-width="1.2"/>
  ${scene.boundaryPointGroups.map((group) => `<path d="${group.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')} Z" fill="none" stroke="#968774" stroke-width="1.15" stroke-dasharray="4 6"/>`).join('\n  ')}
  ${scene.visibleStars.map((star) => `<circle cx="${star.x.toFixed(1)}" cy="${star.y.toFixed(1)}" r="${starRadius(star.mag).toFixed(2)}" fill="#11100f"/>`).join('\n  ')}
  ${scene.visibleMessier.map((object) => drawDsoSvgMarkup(object, object.x, object.y)).join('\n  ')}
  ${scene.visibleMessier.slice(0, 10).map((object) => `<text x="${(object.x + 8).toFixed(1)}" y="${(object.y - 6).toFixed(1)}" fill="#b21d18" font-family="Helvetica, Arial, sans-serif" font-size="10">${object.label}</text>`).join('\n  ')}
  ${scene.labeledStars.slice(0, 14).map((star) => `<text x="${(star.x + 7).toFixed(1)}" y="${(star.y - 6).toFixed(1)}" fill="#43382e" font-family="Helvetica, Arial, sans-serif" font-size="9">${star.designation || star.properName}</text>`).join('\n  ')}
  <text x="24" y="42" fill="#171412" font-family="Georgia, serif" font-size="26" font-weight="700">${constellation.name}</text>
  <text x="24" y="64" fill="#695a4d" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="1.3">${constellation.iauCode} · stars, IAU boundaries, Messier objects</text>
</svg>`;

  const commands = [
    'q',
    '1 1 1 rg',
    '0 0 612 792 re f',
    '0.09 0.08 0.07 RG',
    '1.2 w',
    '36 36 540 720 re S',
    'BT /F2 24 Tf 44 742 Td (' + escapePdfText(constellation.name) + ') Tj ET',
    'BT /F1 10 Tf 44 724 Td (' + escapePdfText(`${constellation.iauCode} · IAU boundary chart with real star and Messier positions`) + ') Tj ET',
    '[4 6] 0 d',
    '0.58 0.52 0.46 RG',
    '0.8 w',
    ...scene.boundaryPointGroups.flatMap((group) => [
      group.map((point, index) => `${(50 + (point.x / scene.width) * 512).toFixed(2)} ${(56 + (point.y / scene.height) * 654).toFixed(2)} ${index === 0 ? 'm' : 'l'}`).join('\n'),
      'h S',
    ]),
    '[] 0 d',
    '0.06 0.05 0.05 rg',
  ];

  for (const star of scene.visibleStars) {
    const x = 50 + (star.x / scene.width) * 512;
    const y = 56 + (star.y / scene.height) * 654;
    commands.push(circlePath(x, y, Math.max(0.8, starRadius(star.mag) * 0.75)));
    commands.push('f');
  }

  for (const object of scene.visibleMessier) {
    const x = 50 + (object.x / scene.width) * 512;
    const y = 56 + (object.y / scene.height) * 654;
    pushDsoPdf(commands, object, x, y);
  }

  commands.push('0.42 0.34 0.28 rg');
  for (const star of scene.labeledStars.slice(0, 10)) {
    const x = 56 + (star.x / scene.width) * 512;
    const y = 64 + (star.y / scene.height) * 654;
    const label = star.designation || star.properName;
    if (label) {
      commands.push(`BT /F1 7 Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(label)}) Tj ET`);
    }
  }

  commands.push('0.70 0.12 0.10 rg');
  for (const object of scene.visibleMessier.slice(0, 12)) {
    const x = 58 + (object.x / scene.width) * 512;
    const y = 64 + (object.y / scene.height) * 654;
    commands.push(`BT /F1 8 Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(object.label)}) Tj ET`);
  }
  commands.push('Q');

  return {
    svg,
    pdf: buildPdfDocument([commands.join('\n')]),
    stats: {
      stars: scene.starsInsideBoundary.length,
      messier: scene.visibleMessier.length,
    },
    includedTargets: scene.visibleMessier.map((object) => ({
      id: object.id,
      label: object.label,
      type: 'messier',
    })),
  };
}

function buildPlanisphereScene(latitudeBand, localSiderealDeg, stars, messierObjects) {
  const radius = 182;
  const center = { x: 306, y: 360 };

  const visibleStars = stars
    .map((star) => {
      const horizontal = equatorialToHorizontal(star.raDeg, star.decDeg, latitudeBand, localSiderealDeg);
      if (horizontal.altitudeDeg <= 0) {
        return null;
      }
      const projected = stereographicProject(horizontal.azimuthDeg, horizontal.altitudeDeg, radius);
      return {
        ...star,
        altitudeDeg: horizontal.altitudeDeg,
        azimuthDeg: horizontal.azimuthDeg,
        x: center.x + projected.x,
        y: center.y + projected.y,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.mag - right.mag);

  const visibleMessier = messierObjects
    .map((object) => {
      const horizontal = equatorialToHorizontal(object.raDeg, object.decDeg, latitudeBand, localSiderealDeg);
      if (horizontal.altitudeDeg <= 0) {
        return null;
      }
      const projected = stereographicProject(horizontal.azimuthDeg, horizontal.altitudeDeg, radius);
      return {
        ...object,
        altitudeDeg: horizontal.altitudeDeg,
        azimuthDeg: horizontal.azimuthDeg,
        priority: (12 - Math.min(object.magnitude, 12)) * 2 + horizontal.altitudeDeg / 20,
        x: center.x + projected.x,
        y: center.y + projected.y,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 18);

  return { center, radius, visibleStars, visibleMessier };
}

export function createPlanispherePreview(latitudeBand, stars, messierObjects) {
  const scene = buildPlanisphereScene(latitudeBand, 300, stars, messierObjects);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
  <rect width="420" height="420" rx="28" fill="#fffdf8"/>
  <rect x="18" y="18" width="384" height="384" rx="20" fill="none" stroke="#171412" stroke-width="1.2"/>
  <circle cx="210" cy="214" r="150" fill="none" stroke="#171412" stroke-width="1.2"/>
  <circle cx="210" cy="214" r="126" fill="none" stroke="#968774" stroke-width="1" stroke-dasharray="4 6"/>
  ${scene.visibleStars.map((star) => `<circle cx="${(scene.center.x / 612 * 420 + (star.x - scene.center.x) / 612 * 420).toFixed(1)}" cy="${(scene.center.y / 792 * 420 + (star.y - scene.center.y) / 792 * 420).toFixed(1)}" r="${Math.max(0.8, starRadius(star.mag) * 0.55).toFixed(2)}" fill="#11100f"/>`).join('\n  ')}
  ${scene.visibleMessier.slice(0, 10).map((object) => drawDsoSvgMarkup(object, scene.center.x / 612 * 420 + (object.x - scene.center.x) / 612 * 420, scene.center.y / 792 * 420 + (object.y - scene.center.y) / 792 * 420)).join('\n  ')}
  <text x="210" y="42" text-anchor="middle" fill="#171412" font-family="Georgia, serif" font-size="24" font-weight="700">Planisphere ${latitudeBand >= 0 ? 'N' : 'S'} ${Math.abs(latitudeBand)}°</text>
  <text x="210" y="68" text-anchor="middle" fill="#66574c" font-family="Helvetica, Arial, sans-serif" font-size="11" letter-spacing="1.3">real stars and Messier objects · 48 LST pages</text>
  <text x="210" y="84" text-anchor="middle" fill="#66574c" font-family="Helvetica, Arial, sans-serif" font-size="9">use site longitude correction for local clock alignment</text>
  <text x="210" y="96" text-anchor="middle" fill="#171412" font-family="Helvetica, Arial, sans-serif" font-size="12">N</text>
  <text x="365" y="218" text-anchor="middle" fill="#171412" font-family="Helvetica, Arial, sans-serif" font-size="12">E</text>
  <text x="210" y="378" text-anchor="middle" fill="#171412" font-family="Helvetica, Arial, sans-serif" font-size="12">S</text>
  <text x="55" y="218" text-anchor="middle" fill="#171412" font-family="Helvetica, Arial, sans-serif" font-size="12">W</text>
</svg>`;
}

function lookupStripText(lstHours) {
  return MONTH_NAMES.map((month, monthIndex) => {
    const solarRaHours = approximateSolarRaDegrees(monthIndex) / 15;
    let localClock = lstHours - solarRaHours + 12;
    while (localClock < 0) localClock += 24;
    while (localClock >= 24) localClock -= 24;
    const hours = String(Math.floor(localClock)).padStart(2, '0');
    const minutes = localClock % 1 >= 0.5 ? '30' : '00';
    return `${month} ${hours}:${minutes}`;
  }).join('   ');
}

export function createPlanispherePdf(latitudeBand, stars, messierObjects) {
  const pages = [];

  pages.push([
    'q',
    '1 1 1 rg',
    '0 0 612 792 re f',
    '0.09 0.08 0.07 RG',
    '1.2 w',
    '36 36 540 720 re S',
    'BT /F2 28 Tf 48 726 Td (' + escapePdfText(`Planisphere book · ${latitudeBand >= 0 ? 'N' : 'S'} ${Math.abs(latitudeBand)}°`) + ') Tj ET',
    'BT /F1 12 Tf 48 696 Td (' + escapePdfText('Real-star hemisphere charts in half-hour sidereal steps, generated from bundled astronomy catalog data.') + ') Tj ET',
    'BT /F1 11 Tf 48 670 Td (' + escapePdfText('Use the site resolver with your observing date, timezone, and longitude to align this latitude-specific book with local clock time.') + ') Tj ET',
    circlePath(306, 360, 180),
    'S',
    'BT /F2 14 Tf 300 547 Td (N) Tj ET',
    'BT /F2 14 Tf 497 365 Td (E) Tj ET',
    'BT /F2 14 Tf 301 180 Td (S) Tj ET',
    'BT /F2 14 Tf 105 365 Td (W) Tj ET',
    'Q',
  ].join('\n'));

  pages.push([
    'q',
    '1 1 1 rg',
    '0 0 612 792 re f',
    '0.09 0.08 0.07 rg',
    'BT /F2 24 Tf 48 730 Td (How to use this book) Tj ET',
    'BT /F1 12 Tf 48 692 Td (' + escapePdfText('1. Pick the page whose local sidereal time best matches the season and observing window you need.') + ') Tj ET',
    'BT /F1 12 Tf 48 666 Td (' + escapePdfText('2. Read the circular chart as the entire hemisphere above the horizon, with north at the top.') + ') Tj ET',
    'BT /F1 12 Tf 48 640 Td (' + escapePdfText('3. Red symbols mark Messier objects; black dots show stars from the bundled XHIP-derived data set.') + ') Tj ET',
    'BT /F1 12 Tf 48 614 Td (' + escapePdfText('4. The lookup strip gives a rough seasonal observing cue by month; use the site resolver for timezone-specific local clock alignment.') + ') Tj ET',
    'BT /F1 12 Tf 48 588 Td (' + escapePdfText('5. This edition intentionally excludes planets, Moon, Sun, and constellation stick figures.') + ') Tj ET',
    'Q',
  ].join('\n'));

  for (let pageIndex = 0; pageIndex < 48; pageIndex += 1) {
    const lstHours = pageIndex * 0.5;
    const scene = buildPlanisphereScene(latitudeBand, lstHours * 15, stars, messierObjects);
    const commands = [
      'q',
      '1 1 1 rg',
      '0 0 612 792 re f',
      '0.09 0.08 0.07 RG',
      '1.1 w',
      '30 30 552 732 re S',
      '0.09 0.08 0.07 rg',
      `BT /F2 18 Tf 48 760 Td (${escapePdfText(`LST ${String(Math.floor(lstHours)).padStart(2, '0')}:${lstHours % 1 === 0.5 ? '30' : '00'}`)}) Tj ET`,
      `BT /F1 10 Tf 48 740 Td (${escapePdfText(`Latitude ${latitudeBand >= 0 ? 'N' : 'S'} ${Math.abs(latitudeBand)}° · latitude-specific field book`)}) Tj ET`,
      '0.82 0.80 0.76 RG',
      '0.8 w',
      '48 706 516 28 re S',
      '0.09 0.08 0.07 rg',
      `BT /F1 8 Tf 54 718 Td (${escapePdfText(lookupStripText(lstHours))}) Tj ET`,
      '0.12 0.10 0.09 RG',
      '1.05 w',
      circlePath(scene.center.x, scene.center.y, scene.radius),
      'S',
      '[4 6] 0 d',
      '0.55 0.49 0.43 RG',
      circlePath(scene.center.x, scene.center.y, scene.radius - 28),
      'S',
      '[] 0 d',
      'BT /F2 12 Tf 301 560 Td (N) Tj ET',
      'BT /F2 12 Tf 496 363 Td (E) Tj ET',
      'BT /F2 12 Tf 302 160 Td (S) Tj ET',
      'BT /F2 12 Tf 103 363 Td (W) Tj ET',
      '0.05 0.04 0.04 rg',
    ];

    for (const star of scene.visibleStars) {
      commands.push(circlePath(star.x, star.y, Math.max(0.75, starRadius(star.mag) * 0.55)));
      commands.push('f');
    }

    for (const object of scene.visibleMessier) {
      pushDsoPdf(commands, object, object.x, object.y);
    }

    commands.push('0.70 0.12 0.10 rg');
    for (const object of scene.visibleMessier.slice(0, 10)) {
      commands.push(`BT /F1 7 Tf ${(object.x + 7).toFixed(2)} ${(object.y - 7).toFixed(2)} Td (${escapePdfText(object.label)}) Tj ET`);
    }

    commands.push('Q');
    pages.push(commands.join('\n'));
  }

  return buildPdfDocument(pages);
}
