import { describe, expect, it } from 'vitest';
import { loadTrails, parseOverpassWays } from './api';

describe('API data handling', () => {
  it('rejects malformed Overpass elements and out-of-range coordinates', () => {
    expect(parseOverpassWays([
      { type: 'way', id: 1, geometry: [{ lat: 40, lon: -111 }, { lat: 40.01, lon: -111.01 }], tags: { name: 'Mapped path' } },
      { type: 'node', id: 2, geometry: [] },
      { type: 'way', id: 3, geometry: [{ lat: 120, lon: 0 }], tags: { name: 'Invalid' } },
      null,
    ])).toHaveLength(1);
    expect(parseOverpassWays({ elements: [] })).toEqual([]);
  });

  it('returns clearly identified illustrative data when the trail request fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('service unavailable', { status: 503 });
    try {
      const result = await loadTrails({ name: 'Test', latitude: 40, longitude: -111 });
      expect(result.source).toBe('Sample data');
      expect(result.note).toMatch(/could not be reached/i);
      expect(result.trails.every((trail) => trail.source === 'Sample data' && /illustrative/i.test(trail.description))).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
