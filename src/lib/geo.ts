import type { Point, Difficulty, Trail } from './types';

const EARTH_RADIUS_MILES = 3958.7613;

export function haversineMiles(a: Point, b: Point): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathDistanceMiles(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversineMiles(points[i - 1], points[i]);
  return total;
}

export function classifyDifficulty(tags: Record<string, string | undefined>): Difficulty {
  const scale = (tags.sac_scale ?? '').toLowerCase();
  if (/demanding|alpine|difficult|expert/.test(scale)) return 'Hard';
  if (/mountain_hiking|hilly|intermediate/.test(scale)) return 'Moderate';
  if (/hiking|T[1-2]|easy/.test(scale)) return 'Easy';
  return 'Unknown';
}

export function scoreTrail(trail: Trail, prefs: { maxMiles: number; difficulty: string; query: string }): number {
  let score = 50;
  if (trail.distanceMiles <= prefs.maxMiles) score += 20;
  else score -= Math.min(30, (trail.distanceMiles - prefs.maxMiles) * 4);
  if (prefs.difficulty === 'Any' || trail.difficulty === prefs.difficulty) score += 15;
  if (trail.difficulty === 'Unknown') score -= 3;
  const query = prefs.query.toLowerCase();
  if (query.includes('easy') && trail.difficulty === 'Easy') score += 25;
  if ((query.includes('challenging') || query.includes('hard')) && trail.difficulty === 'Hard') score += 25;
  if ((query.includes('short') || query.includes('quick')) && trail.distanceMiles <= 3) score += 20;
  if ((query.includes('long') || query.includes('all day')) && trail.distanceMiles >= 5) score += 15;
  if (query.includes('flat') && /flat|paved/i.test(`${trail.surface} ${trail.description}`)) score += 15;
  return score;
}

export function filterTrails(trails: Trail[], prefs: { maxMiles: number; difficulty: string; query: string }): Trail[] {
  const normalized = prefs.query.trim().toLowerCase();
  return trails
    .filter((trail) => trail.distanceMiles <= prefs.maxMiles)
    .filter((trail) => prefs.difficulty === 'Any' || trail.difficulty === prefs.difficulty || trail.difficulty === 'Unknown')
    .filter((trail) => !normalized || `${trail.name} ${trail.surface} ${trail.difficulty} ${trail.description}`.toLowerCase().includes(normalized))
    .sort((a, b) => scoreTrail(b, prefs) - scoreTrail(a, prefs));
}
