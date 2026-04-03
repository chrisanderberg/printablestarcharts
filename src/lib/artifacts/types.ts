export type ArtifactSchemaVersion = '1';

export type ArtifactType = 'constellation-chart' | 'planisphere-book';

export type PageSize = 'letter' | 'a4';

export type PageOrientation = 'portrait' | 'landscape';

export type HemisphereBias =
  | 'northern'
  | 'southern'
  | 'equatorial';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn' | 'year-round';

export type TargetType = 'messier';

export type ResolutionPolicy = 'exact' | 'nearest-supported';

export interface ArtifactFileSet {
  pdf: string;
  thumbnailSvg?: string;
}

export interface ArtifactCollection<TItem> {
  schemaVersion: ArtifactSchemaVersion;
  generatedAt: string;
  items: TItem[];
}

export interface CanonicalTarget {
  id: string;
  label: string;
  aliases: string[];
  type: TargetType;
}

export type CanonicalTargetCollection = ArtifactCollection<CanonicalTarget>;

export interface IncludedTargetSummary {
  id: string;
  label: string;
  type: TargetType;
}

export interface ChartPageSpec {
  size: PageSize;
  orientation: PageOrientation;
}

export interface ConstellationCoverage {
  centerRaHours: number;
  centerDecDeg: number;
  radiusDeg: number;
}

export interface ConstellationCounts {
  stars: number;
  messier: number;
  forcedTargets: number;
}

export interface ConstellationFeatures {
  iauBoundaries: boolean;
  cardinalMarkers: boolean;
}

export interface ConstellationIndexItem {
  id: string;
  iauCode: string;
  slug: string;
  name: string;
  hemisphereBias: HemisphereBias;
  seasons: Season[];
  manifestPath: string;
}

export type ConstellationIndex = ArtifactCollection<ConstellationIndexItem>;

export interface ConstellationManifest {
  schemaVersion: ArtifactSchemaVersion;
  artifactType: 'constellation-chart';
  id: string;
  iauCode: string;
  slug: string;
  name: string;
  title: string;
  version: string;
  generatedAt: string;
  page: ChartPageSpec;
  coverage: ConstellationCoverage;
  counts: ConstellationCounts;
  features: ConstellationFeatures;
  files: ArtifactFileSet;
  includedTargets: IncludedTargetSummary[];
}

export interface PlanisphereIndexItem {
  id: string;
  latitudeBand: number;
  utcOffsetMinutes: number;
  timezoneLabel: string;
  manifestPath: string;
}

export type PlanisphereIndex = ArtifactCollection<PlanisphereIndexItem>;

export interface PlanisphereLocationModel {
  latitudeBand: number;
  utcOffsetMinutes: number;
  timezoneLabel: string;
  resolutionPolicy: ResolutionPolicy;
}

export interface PlanispherePageSpec extends ChartPageSpec {
  pageCount: number;
}

export interface PlanisphereManifest {
  schemaVersion: ArtifactSchemaVersion;
  artifactType: 'planisphere-book';
  id: string;
  version: string;
  generatedAt: string;
  locationModel: PlanisphereLocationModel;
  page: PlanispherePageSpec;
  files: ArtifactFileSet;
  supportedForcedTargets: string[];
}

export interface NormalizedTargetSelection {
  input: string;
  normalizedId: string;
  matchedLabel: string;
}

export interface UnsupportedTargetSelection {
  input: string;
  reason: 'unknown-target' | 'unsupported-by-artifact';
}

export interface TargetSelectionResult {
  supported: NormalizedTargetSelection[];
  unsupported: UnsupportedTargetSelection[];
}
