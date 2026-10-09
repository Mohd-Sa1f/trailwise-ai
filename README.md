# TrailWise AI

**Trail discovery, weather context, and thoughtful outdoor planning.**

TrailWise is a responsive portfolio project for exploring named mapped path segments, checking a forecast, filtering options, saving trails locally, and getting an explainable recommendation based on a user's preferences.

> **Safety and data note:** TrailWise is a prototype, not an authoritative navigation, avalanche, emergency, or trail-safety service. Open map data can be incomplete or stale. Distances represent mapped path segments, not necessarily complete hiking routes. Verify closures, access rules, permits, weather alerts, and conditions with official local sources before heading out. Sample routes used during service outages are explicitly marked as illustrative and must not be used for navigation.

## Features

- Search for a city or place using Open-Meteo's geocoding API.
- Interactive map using Leaflet and OpenStreetMap tiles.
- Fetch nearby named path, footway, track, and bridleway segments from OpenStreetMap through Overpass API.
- Estimate mapped-segment lengths with the haversine formula.
- Filter and rank results by distance, mapped difficulty, text, and simple natural-language preferences.
- Show current conditions and a five-day forecast from Open-Meteo.
- Provide a transparent rules-based planning guide. It matches simple preference phrases to the currently loaded data and explains its results; it is not connected to a hosted large language model.
- Save and unsave trails in this browser using local storage.
- Use browser geolocation only after the visitor clicks **Near me**.
- Responsive desktop and mobile layout, loading states, empty states, and data-source attribution.
- Unit tests for distance calculations and trail preference scoring.

## Stack

- React 18 + TypeScript
- Vite
- Leaflet + React Leaflet
- Lucide icons
- OpenStreetMap + Overpass API
- Open-Meteo Geocoding and Forecast APIs
- Vitest

## Run locally

You need a current supported Node.js LTS release and npm.

1. Clone your repository or open the project folder in a terminal.
2. Install packages:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the local URL Vite prints in the terminal, usually `http://localhost:5173`.

5. Run the tests:

   ```bash
   npm test
   ```

6. Check a production build:

   ```bash
   npm run build
   ```

No API key is required for the current prototype. It calls public geocoding, forecast, map-tile, and Overpass services from the browser. These services may rate-limit requests or be temporarily unavailable. The app falls back to clearly labelled illustrative route shapes if it cannot retrieve named mapped segments. Do not describe sample data as real trails.

## Project structure

```text
trailwise-ai/
├── src/
│   ├── components/
│   │   └── TrailMap.tsx       # Leaflet map and trail overlays
│   ├── lib/
│   │   ├── api.ts              # Geocoding, trail, and forecast requests
│   │   ├── geo.ts              # Distance and scoring logic
│   │   ├── geo.test.ts         # Unit tests
│   │   ├── types.ts            # Shared application types
│   │   └── weather.ts          # Forecast labels and cautious guidance
│   ├── App.tsx                 # Product interface and interactions
│   ├── main.tsx                # App entry point
│   └── styles.css              # Responsive visual system
├── .env.example
├── .gitignore
├── CODEX_PROMPT.md             # Suggested follow-up task for Codex
├── index.html
├── package.json
└── README.md
```

## Data and privacy

- Searches use Open-Meteo's geocoding service.
- Forecast requests send the selected coordinates to Open-Meteo.
- Trail requests send the selected coordinates to the Overpass API.
- Map tiles are requested from OpenStreetMap tile servers.
- Saved trail IDs are stored in this browser's local storage. They are not synchronized across devices.
- Browser geolocation is only requested after a visitor uses the **Near me** button.
- This project has no backend, account system, analytics, or API secrets.

## Known limitations and next steps

1. Some map features are returned as individual OSM way segments, not complete hiking routes. Route relations and official trail datasets should be incorporated in a future version.
2. Difficulty and surface data may not be mapped; the app therefore shows `Unknown` or `Not specified` rather than inferring a fact.
3. The planning guide is a small deterministic rules engine. A production AI feature should be implemented server-side with a provider API key stored only in environment variables, structured tool outputs, tests, and clear grounding that prevents invented route facts.
4. Weather heuristics are general indicators, not safety classifications. The prototype does not use official weather warnings, avalanche forecasts, fire closures, land-manager notices, or trail-condition reports.
5. Public API endpoints can be rate-limited. A production version should introduce caching, request throttling, retries with backoff, and appropriate provider terms compliance.
6. Estimated hiking times use a rough 30-minutes-per-mile heuristic and don't account for elevation gain, terrain, breaks, or individual fitness.

## Attribution

- Map and trail data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License.
- Geocoding and weather: [Open-Meteo](https://open-meteo.com/). Review its current terms and attribution requirements before public commercial use.
- Map rendering: [Leaflet](https://leafletjs.com/) and [React Leaflet](https://react-leaflet.js.org/).

## License

MIT. See [LICENSE](./LICENSE).
