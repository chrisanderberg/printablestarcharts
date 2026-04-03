import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'printablestarcharts-targets';
export const MAX_PINNED_TARGETS = 6;
const DEFAULT_TARGETS = ['m31', 'm42'];

function sanitizeTargetIds(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }

    const normalized = entry.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    sanitized.push(normalized);

    if (sanitized.length >= MAX_PINNED_TARGETS) {
      break;
    }
  }

  return sanitized;
}

export function usePinnedTargets() {
  const [targetIds, setTargetIdsState] = useState<string[]>(DEFAULT_TARGETS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTargetIdsState(sanitizeTargetIds(JSON.parse(stored) as unknown, DEFAULT_TARGETS));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const setTargetIds = useCallback((next: string[]) => {
    const limited = sanitizeTargetIds(next);
    setTargetIdsState(limited);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch {
      // ignore storage errors
    }
  }, []);

  const addTarget = useCallback(
    (id: string) => {
      setTargetIds([...targetIds.filter((t) => t !== id), id]);
    },
    [targetIds, setTargetIds]
  );

  const removeTarget = useCallback(
    (id: string) => {
      setTargetIds(targetIds.filter((t) => t !== id));
    },
    [targetIds, setTargetIds]
  );

  return { targetIds, setTargetIds, addTarget, removeTarget };
}
