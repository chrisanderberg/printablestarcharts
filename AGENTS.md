# AGENTS.md

## Purpose
- This file defines how agents should operate in this worktree.
- Read `PROJECT.md` for project context, goals, and product shape.
- Read `REQUIREMENTS.md` for the active implementation contract.

## Source of truth
- Direct user instructions win.
- `REQUIREMENTS.md` governs active implementation constraints and tradeoffs.
- `PROJECT.md` governs stable project description, goals, and domain framing.

If these documents conflict:
1. direct user instructions win
2. `REQUIREMENTS.md` wins for active implementation constraints
3. `PROJECT.md` wins for project framing and goals

## Requirement handling
- Hard requirements are binding. Do not violate them unless the human explicitly changes or waives them.
- Soft requirements are preferred guidance. Follow them by default, but you may deviate when there is a clear task-specific reason.
- Agents may add or refine soft requirements when they discover reusable guidance during implementation.
- Humans may add or revise hard and soft requirements.
- Agents must not silently create, remove, or weaken hard requirements.
- If a soft requirement appears important enough to become mandatory, add it to the candidate promotion section in `REQUIREMENTS.md` instead of promoting it directly.
- Durable rationale should be recorded directly with the relevant soft requirement in `REQUIREMENTS.md`.
- Do not use `REQUIREMENTS.md` as a scratchpad or status log. Add only reusable guidance or binding constraints.
- When requirements emerge from prototypes or examples, capture them in `REQUIREMENTS.md` in a reusable form.
- Keep `REQUIREMENTS.md` concise and reviewable. Do not add task-specific notes that will not matter to future work.

## Documentation maintenance
- Update `PROJECT.md` when the stable description, goals, or project framing changes.
- Update `REQUIREMENTS.md` when active constraints, design guidance, or implementation-structure guidance change.

## Execution rules
- If something is not specified, do not guess silently. Surface the gap or make the narrowest safe assumption, and record that assumption in `REQUIREMENTS.md` under `Open questions` or an `Assumptions` section if one is needed.
- Prefer parameterization over hardcoding when requirements are still evolving.
- Keep code structure reviewable. Split large files or functions when they become difficult to understand.
- Add brief comments only where intent or invariants are not obvious from the code.

## Definition of done
- The implementation satisfies the active hard requirements.
- Any intentional deviation from a soft requirement is explainable.
- Relevant tests or checks are run for the changed area.
- Any new reusable implementation guidance discovered during the task is added to the soft requirements in `REQUIREMENTS.md`.
