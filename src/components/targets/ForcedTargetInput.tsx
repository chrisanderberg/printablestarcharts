import { useId, useState } from 'react';

import type { CanonicalTarget } from '@/lib/artifacts/types';
import { resolveForcedTargets } from '@/lib/artifacts/resolveForcedTargets';

interface Props {
  canonicalTargets: CanonicalTarget[];
  selectedTargetIds: string[];
  onChange: (next: string[]) => void;
}

export default function ForcedTargetInput({
  canonicalTargets,
  selectedTargetIds,
  onChange,
}: Props) {
  const listId = useId();
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<string>('Pinned Messier targets are shared across the constellation browser and the planisphere resolver.');
  const selectedTargets = canonicalTargets.filter((target) => selectedTargetIds.includes(target.id));

  function addTargets(rawValue: string) {
    const parts = rawValue
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) {
      return;
    }

    const resolved = resolveForcedTargets(parts, canonicalTargets);
    const nextIds = [...selectedTargetIds];

    for (const target of resolved.supported) {
      if (!nextIds.includes(target.normalizedId)) {
        nextIds.push(target.normalizedId);
      }
    }

    onChange(nextIds.slice(0, 6));
    setValue('');

    if (resolved.unsupported.length) {
      setFeedback(`Unmatched target: ${resolved.unsupported[0].input}. Try a Messier ID such as M31 or M42.`);
      return;
    }

    setFeedback(
      resolved.supported.length
        ? `Pinned ${resolved.supported.map((target) => target.matchedLabel).join(', ')}.`
        : 'No new targets added.'
    );
  }

  function removeTarget(targetId: string) {
    onChange(selectedTargetIds.filter((candidate) => candidate !== targetId));
  }

  return (
    <div className="target-input">
      <div className="target-input__row">
        <input
          className="target-input__field"
          list={listId}
          name="forced-target"
          placeholder="Add Messier targets, for example M31, M42, or M13"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addTargets(value);
            }
          }}
        />
        <button type="button" className="button" onClick={() => addTargets(value)}>
          Pin targets
        </button>
      </div>

      <datalist id={listId}>
        {canonicalTargets.map((target) => (
          <option key={target.id} value={target.label} />
        ))}
      </datalist>

      <div className="chip-row">
        {selectedTargets.length ? (
          selectedTargets.map((target) => (
            <span key={target.id} className="target-chip">
              <span>{target.label}</span>
              <button type="button" onClick={() => removeTarget(target.id)} aria-label={`Remove ${target.label}`}>
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="pill">No pinned targets yet</span>
        )}
      </div>

      <p className="feedback">{feedback}</p>
    </div>
  );
}
