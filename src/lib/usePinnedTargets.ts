import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'printablestarcharts-targets';
const MAX_TARGETS = 6;
const DEFAULT_TARGETS = ['m31', 'm42'];

export function usePinnedTargets() {
  const [targetIds, setTargetIdsState] = useState<string[]>(DEFAULT_TARGETS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          setTargetIdsState((parsed as string[]).slice(0, MAX_TARGETS));
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const setTargetIds = useCallback((next: string[]) => {
    const limited = next.slice(0, MAX_TARGETS);
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
