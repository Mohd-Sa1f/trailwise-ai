# Codex follow-up prompt

You are working on TrailWise AI, a React 18 + TypeScript + Vite outdoor trail exploration prototype. Read `README.md` and the current code before editing. Do not replace working functionality with mock-only implementations.

## Goal

Make the existing project more reliable and production-quality while keeping its transparent data handling and safety disclaimers.

## Start by

1. Run `npm install`, `npm test`, and `npm run build`.
2. Fix TypeScript errors, lint-level issues, and failing tests without removing features.
3. Exercise these flows in a browser when a browser tool is available: search a location; load Open-Meteo weather; load Overpass trail segments; filter by distance and difficulty; select a path on the map; save/unsave a trail; test the rules-based guide; test empty, failed-request, and sample-data states.
4. Fix current data-flow edge cases and add tests for newly fixed logic.

## Quality rules

- Never claim an illustrative sample route is a real-world trail.
- Never present a mapped path segment as a verified full hike.
- Preserve OpenStreetMap and Open-Meteo attribution and the safety disclaimers.
- Do not invent trail names, trail conditions, difficulty, elevation, closures, weather alerts, or safety ratings.
- Avoid adding paid API dependencies. If an LLM provider is added, it must be optional, called through a server-side route, and use a secret stored in an environment variable. Never put a provider secret in browser code or commit one.
- Keep keyboard focus visible and make all interactive controls accessible with labels and sensible disabled/loading states.
- Ensure geolocation is only requested after a visitor clicks the location button.
- Avoid unnecessary dependencies; add tests for distance, filtering, scoring, API parsing, and error handling.
- If API limits or browser CORS issues arise, implement clear errors, caching/backoff where appropriate, and document the remaining constraint. Do not silently imply live data loaded when it did not.

At the end, summarize files changed, verification commands and their actual results, any limitations left, and exact local run instructions. Do not claim tests or browser checks passed unless you ran them.
