import { describe, expect, it } from 'vitest';
import { filterTrails, haversineMiles, pathDistanceMiles, scoreTrail } from './geo';
import type { Trail } from './types';

describe('geospatial utilities', () => {
  it('calculates the distance between Tampa and Orlando to a reasonable approximation', () => {
    const distance = haversineMiles({ lat: 27.9506, lon: -82.4572 }, { lat: 28.5383, lon: -81.3792 });
    expect(distance).toBeGreaterThan(74);
    expect(distance).toBeLessThan(80);
  });

  it('adds the length of each segment in a path', () => {
    const length = pathDistanceMiles([{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 0, lon: 2 }]);
    expect(length).toBeGreaterThan(137);
    expect(length).toBeLessThan(140);
  });

  it('ranks a short easy trail well for a quick easy-hike request', () => {
    const trail: Trail = { id: 'test', name: 'Test Trail', points: [], distanceMiles: 2, difficulty: 'Easy', surface: 'paved', foot: 'yes', description: 'Flat trail', source: 'Sample data' };
    expect(scoreTrail(trail, { maxMiles: 3, difficulty: 'Easy', query: 'quick easy flat walk' })).toBeGreaterThan(100);
  });

  it('filters by distance, difficulty, and text while retaining unknown mapped difficulty', () => {
    const trails: Trail[] = [
      { id: 'easy', name: 'Creek Path', points: [], distanceMiles: 2, difficulty: 'Easy', surface: 'dirt', foot: 'yes', description: 'shaded', source: 'OpenStreetMap' },
      { id: 'unknown', name: 'Ridge Connector', points: [], distanceMiles: 2.5, difficulty: 'Unknown', surface: 'gravel', foot: 'yes', description: 'open', source: 'OpenStreetMap' },
      { id: 'far', name: 'Creek Loop', points: [], distanceMiles: 6, difficulty: 'Easy', surface: 'dirt', foot: 'yes', description: 'shaded', source: 'OpenStreetMap' },
    ];
    expect(filterTrails(trails, { maxMiles: 3, difficulty: 'Easy', query: 'creek' }).map((trail) => trail.id)).toEqual(['easy']);
    expect(filterTrails(trails, { maxMiles: 3, difficulty: 'Moderate', query: '' }).map((trail) => trail.id)).toEqual(['unknown']);
  });
});
