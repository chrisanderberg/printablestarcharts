import { useState } from 'react';

import type { CanonicalTarget } from '@/lib/artifacts/types';
import { resolveForcedTargets } from '@/lib/artifacts/resolveForcedTargets';
import { MAX_PINNED_TARGETS, usePinnedTargets } from '@/lib/usePinnedTargets';

interface Props {
  canonicalTargets: CanonicalTarget[];
}

export default function TargetManager({ canonicalTargets }: Props) {
  const { targetIds, setTargetIds } = usePinnedTargets();
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<string>(
    'Pin up to 6 Messier targets. Pinned targets influence constellation sort order and planisphere compatibility checks.'
  );

  const selectedTargets = canonicalTargets.filter((t) => targetIds.includes(t.id));

  function addTargets(raw: string) {
    const parts = raw
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;

    const resolved = resolveForcedTargets(parts, canonicalTargets);
    const nextIds = [...targetIds];
    const addedLabels: string[] = [];
    const blockedLabels: string[] = [];

    for (const t of resolved.supported) {
      if (nextIds.includes(t.normalizedId)) {
        continue;
      }

      if (nextIds.length >= MAX_PINNED_TARGETS) {
        blockedLabels.push(t.matchedLabel);
        continue;
      }

      nextIds.push(t.normalizedId);
      addedLabels.push(t.matchedLabel);
    }

    setTargetIds(nextIds);
    setInputValue('');

    const messages: string[] = [];

    if (addedLabels.length) {
      messages.push(`Pinned ${addedLabels.join(', ')}.`);
    }

    if (blockedLabels.length) {
      messages.push(
        `Limit is ${MAX_PINNED_TARGETS}. Remove one pinned target to add ${blockedLabels.join(', ')}.`
      );
    }

    if (resolved.unsupported.length) {
      messages.push(
        `Unknown target: ${resolved.unsupported[0].input}. Try a Messier ID like M31 or M42.`
      );
    }

    setFeedback(messages.length ? messages.join(' ') : 'No new targets added.');
  }

  function removeTarget(id: string) {
    setTargetIds(targetIds.filter((t) => t !== id));
  }

  function toggleTarget(id: string) {
    if (targetIds.includes(id)) {
      removeTarget(id);
    } else {
      setTargetIds([...targetIds, id].slice(0, MAX_PINNED_TARGETS));
    }
  }

  return (
    <div className="target-manager">
      <div className="target-manager__pinned">
        <p className="target-manager__section-title">Pinned targets</p>

        <div className="target-manager__input-row">
          <input
            className="target-manager__input"
            list="target-options"
            placeholder="Add a Messier target — e.g. M31 or Andromeda"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTargets(inputValue);
              }
            }}
            aria-label="Add Messier target"
          />
          <button type="button" className="btn" onClick={() => addTargets(inputValue)}>
            Pin
          </button>
        </div>

        <datalist id="target-options">
          {canonicalTargets.map((t) => (
            <option key={t.id} value={t.label} />
          ))}
        </datalist>

        <div className="tag-row">
          {selectedTargets.length > 0 ? (
            selectedTargets.map((t) => (
              <span key={t.id} className="chip">
                <span>{t.label}</span>
                <button
                  type="button"
                  onClick={() => removeTarget(t.id)}
                  aria-label={`Remove ${t.label}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="tag">No pinned targets</span>
          )}
        </div>

        <p className="feedback">{feedback}</p>
      </div>

      <hr className="divider" />

      <div className="target-manager__catalog">
        <p className="target-manager__section-title">
          Messier catalog — {canonicalTargets.length} objects
        </p>
        <div className="target-catalog-grid">
          {canonicalTargets.map((t) => {
            const isPinned = targetIds.includes(t.id);
            const canPin = !isPinned && targetIds.length < MAX_PINNED_TARGETS;
            return (
              <div
                key={t.id}
                className={`target-catalog-item${isPinned ? ' target-catalog-item--pinned' : ''}`}
              >
                <div className="target-catalog-item__label">
                  <span className="target-catalog-item__id mono">{t.label}</span>
                  {t.aliases.length > 0 && (
                    <span className="target-catalog-item__alias muted">{t.aliases[0]}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn--ghost target-catalog-item__btn"
                  onClick={() => toggleTarget(t.id)}
                  disabled={!isPinned && !canPin}
                  aria-pressed={isPinned}
                >
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
