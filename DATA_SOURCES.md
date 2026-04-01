# DATA_SOURCES.md

## Purpose
This document records the astronomy data sources used by the MVP generator.

## Current implementation
The current generator reads bundled data files from the `d3-celestial` package
installed in `node_modules/`, then converts those real sky inputs into the site
artifact format used by `site-public/generated/`.

## Upstream data provenance
- Stars: XHIP, the Extended Hipparcos Compilation, via CDS VizieR `V/137D`
- Star names/designations: cross-index sources listed by `d3-celestial`,
  including CDS VizieR `IV/27A`, `IV/22`, `B/gcvs`, and `V/70A`
- Constellation names and metadata: IAU constellation references
- Constellation boundaries: Catalogue of Constellation Boundary Data, CDS
  VizieR `VI/49`
- Messier objects: Messier object data as packaged by `d3-celestial`

## Notes
- The generator intentionally excludes constellation stick figures from MVP
  output because they are not formally defined by the IAU and were removed from
  the active requirements.
- The repository currently keeps the static site and local artifact generator in
  one worktree, while still separating generated artifacts from the site UI and
  runtime data-loading paths.
- A future refinement should replace package-bundled inputs with checked-in raw
  source snapshots or direct reproducible fetch scripts once networked data
  acquisition is settled for this repo.
