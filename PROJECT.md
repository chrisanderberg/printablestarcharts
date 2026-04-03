# PROJECT.md

## Overview
printablestarcharts is a print-first web app for generating highly readable
star charts optimized for printing and field use under red light. It also has
an intended on-screen Red Night Mode for situations where a screen is
unavoidable.

Primary domain: `https://printablestarcharts.app`

## Purpose
printablestarcharts exists to:
- generate printable charts that remain legible in real field conditions
- support paper-first astronomy workflows where screens are inconvenient
- provide a calmer, more usable alternative to cluttered or souvenir-style sky
  charts

## Audience
The site primarily serves the author and similar observers doing:
- binocular observing
- general stargazing
- Dobsonian observing
- star hopping

## Priorities
When making tradeoffs, prioritize:
1. Field usability
2. Print readability
3. Information-design clarity
4. Correctness of generated charts
5. Performance sufficient to avoid feeling sloppy

## Non-goals
For MVP, printablestarcharts does not include:
- sky-at-a-moment charts
- sun, moon, or planet support
- eyepiece or zoom charts
- weather or cloud modeling
- decorative space-poster styling

## Information architecture

### Routes
The initial site should include:
- `/` for the homepage and chart-generator entry point
- `/about/` for the site About page

Additional chart-specific routes can be added later once the product structure
solidifies, but the initial repo should stay centered on the main experience.

## Product character
The site should feel:
- print-first
- precise
- calm
- field-practical

The default visual language should emphasize signage-level clarity, crisp
vector marks, official sky boundaries/object positions, and restrained use of
red. Red Night Mode must remain strictly red-on-black.

## Current document model
- `AGENTS.md` defines how agents should work in this repo.
- `PROJECT.md` defines the product, goals, audience, and information
  architecture.
- `REQUIREMENTS.md` defines the active implementation contract, including
  design and implementation-structure requirements.

## How to use this file
- Read this file first to understand what the product is, who it serves, and
  what shape it should have.
- Read `REQUIREMENTS.md` next for the active implementation contract.
