import type {
  CanonicalTarget,
  NormalizedTargetSelection,
  TargetSelectionResult,
  UnsupportedTargetSelection,
} from './types';

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildLookup(targets: CanonicalTarget[]) {
  const lookup = new Map<string, CanonicalTarget>();

  for (const target of targets) {
    const variants = [target.id, target.label, ...target.aliases];
    for (const variant of variants) {
      lookup.set(normalize(variant), target);
    }
  }

  return lookup;
}

export function resolveForcedTargets(
  inputs: string[],
  canonicalTargets: CanonicalTarget[],
  supportedTargetIds?: string[]
): TargetSelectionResult {
  const lookup = buildLookup(canonicalTargets);
  const supportedSet = supportedTargetIds ? new Set(supportedTargetIds) : undefined;
  const supported: NormalizedTargetSelection[] = [];
  const unsupported: UnsupportedTargetSelection[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    const normalizedInput = normalize(input);
    if (!normalizedInput) {
      continue;
    }

    const target = lookup.get(normalizedInput);
    if (!target) {
      unsupported.push({ input, reason: 'unknown-target' });
      continue;
    }

    if (supportedSet && !supportedSet.has(target.id)) {
      unsupported.push({ input, reason: 'unsupported-by-artifact' });
      continue;
    }

    if (seen.has(target.id)) {
      continue;
    }

    seen.add(target.id);
    supported.push({
      input,
      normalizedId: target.id,
      matchedLabel: target.label,
    });
  }

  return { supported, unsupported };
}
