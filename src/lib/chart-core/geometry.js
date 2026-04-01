export function normalizeDegrees360(value) {
  return ((value % 360) + 360) % 360;
}

export function normalizeSignedDegrees(value) {
  const normalized = normalizeDegrees360(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function unwrapRightAscension(referenceRaDeg, raDeg) {
  const delta = normalizeSignedDegrees(raDeg - referenceRaDeg);
  return referenceRaDeg + delta;
}

export function polygonBounds(points, referenceRaDeg) {
  const unwrapped = points.map((point) => ({
    x: unwrapRightAscension(referenceRaDeg, point.raDeg),
    y: point.decDeg,
  }));

  const xValues = unwrapped.map((point) => point.x);
  const yValues = unwrapped.map((point) => point.y);

  return {
    points: unwrapped,
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
}

export function pointInPolygon(point, polygon) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const xi = polygon[index].x;
    const yi = polygon[index].y;
    const xj = polygon[previous].x;
    const yj = polygon[previous].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function gmstDegrees(date) {
  const milliseconds = date.getTime();
  const julianDay = milliseconds / 86400000 + 2440587.5;
  const centuries = (julianDay - 2451545.0) / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * (julianDay - 2451545) +
    0.000387933 * centuries * centuries -
    (centuries * centuries * centuries) / 38710000;
  return normalizeDegrees360(gmst);
}

export function localSiderealDegrees(date, longitudeDeg) {
  return normalizeDegrees360(gmstDegrees(date) + longitudeDeg);
}

export function equatorialToHorizontal(raDeg, decDeg, latitudeDeg, localSiderealDeg) {
  const hourAngleDeg = normalizeSignedDegrees(localSiderealDeg - raDeg);
  const hourAngle = (hourAngleDeg * Math.PI) / 180;
  const declination = (decDeg * Math.PI) / 180;
  const latitude = (latitudeDeg * Math.PI) / 180;

  const altitude = Math.asin(
    Math.sin(declination) * Math.sin(latitude) +
      Math.cos(declination) * Math.cos(latitude) * Math.cos(hourAngle)
  );

  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latitude) - Math.tan(declination) * Math.cos(latitude)
  );

  return {
    altitudeDeg: (altitude * 180) / Math.PI,
    azimuthDeg: normalizeDegrees360((azimuth * 180) / Math.PI + 180),
  };
}

export function stereographicProject(azimuthDeg, altitudeDeg, radius) {
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const altitude = (altitudeDeg * Math.PI) / 180;
  const radial = radius * Math.tan((Math.PI / 2 - altitude) / 2);

  return {
    x: radial * Math.sin(azimuth),
    y: -radial * Math.cos(azimuth),
  };
}

export function approximateSolarRaDegrees(monthIndex) {
  const monthlyApproximation = [300, 330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
  return monthlyApproximation[monthIndex] ?? 0;
}
