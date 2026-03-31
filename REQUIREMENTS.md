# REQUIREMENTS.md

## Purpose
This file tracks the active implementation contract for printablestarcharts. It
captures the requirements that should guide implementation and review.

## How to interpret this file
- Hard requirements are mandatory. Agents must not violate them unless the
  human explicitly changes or approves an exception.
- Soft requirements are recommended defaults. Agents should follow them unless
  there is a clear, task-specific reason not to.
- Human approval is required before adding, removing, or changing a hard
  requirement.

## Hard requirements
- The site shall be implemented as a static Astro site.
- The hosting target shall be GitHub Pages.
- The website shall remain clearly separated from any astronomy data pipeline.
- The website shall consume generated astronomy artifacts rather than raw
  catalog ETL logic.
- MVP shall include:
  - printable constellation charts for all 88 IAU constellations
  - a generated planisphere book based on latitude, longitude, and timezone
  - support for user-selected forced-inclusion targets
- MVP catalog scope shall be limited to fixed-sphere objects:
  stars plus Messier deep-sky objects.
- MVP shall exclude the sun, moon, planets, and other moving or
  parallax-sensitive objects.
- Export output shall target print-ready PDF.
- Red Night Mode shall be strictly red-on-black with no other colors.

## Soft requirements
- Prioritize field readability under red flashlight over decorative astronomy
  aesthetics.
- Use crisp vector marks, subtle constellation stick lines, and dotted IAU
  boundaries.
- Avoid photorealistic sky imagery, gradients, lens flares, and souvenir-poster
  styling.
- Keep light mode toner-friendly and print-first.
- Preserve calm, signage-level information design rather than dashboard clutter.
- Circular charts should preserve clear N/E/S/W markers.
- Object inclusion should respect density limits while still honoring important
  navigation stars and forced-inclusion targets.

## Implementation structure
- Prefer one Astro app at the repo root unless the project grows enough that a
  multi-package structure is clearly justified.
- Keep the data pipeline and website as separate concerns.
- Keep a shared site shell for layout, header, navigation, and common styling.
- Prefer a repository shape roughly like:
  - `AGENTS.md`, `PROJECT.md`, `REQUIREMENTS.md`
  - `public/` for shared public assets
  - `src/components/` for shared site and chart UI
  - `src/layouts/` for site layouts
  - `src/lib/` for site config and generated-asset loaders
  - `src/pages/` for top-level routes
  - `src/styles/` for global and theme styles
  - a separate pipeline repo or pipeline directory only when explicitly needed

## Candidate promotions to hard requirements
- None yet.

## Open questions
- Which generated chart artifacts should be checked into this repo versus
  produced externally and copied in during release workflows.
