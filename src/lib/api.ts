import { classifyDifficulty, pathDistanceMiles } from './geo';
import type { Place, Point, Trail, WeatherData } from './types';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const FALLBACK_PLACE: Place = {
  name: 'Salt Lake City',
  admin1: 'Utah',
  country: 'United States',
  latitude: 40.7608,
  longitude: -111.891,
};

async function fetchJson<T>(url: string, timeoutMs = 16000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: cleanQuery, count: '8', language: 'en', format: 'json' }).toString();
  const data = await fetchJson<{ results?: Array<{ name: string; country?: string; admin1?: string; latitude: number; longitude: number }> }>(url.toString());
  return (data.results ?? []).filter((item) =>
    typeof item.name === 'string' && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
      && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180,
  ).map((item) => ({
    name: item.name,
    country: item.country,
    admin1: item.admin1,
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}

export function placeLabel(place: Place): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(', ');
}

type OverpassWay = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

export function parseOverpassWays(elements: unknown): OverpassWay[] {
  if (!Array.isArray(elements)) return [];
  return elements.filter((value): value is OverpassWay => {
    if (!value || typeof value !== 'object') return false;
    const way = value as Partial<OverpassWay>;
    return way.type === 'way' && Number.isFinite(way.id)
      && Array.isArray(way.geometry)
      && way.geometry.every((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lon)
        && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180)
      && (!way.tags || typeof way.tags === 'object');
  });
}

function sampleTrail(center: Point, id: number, distance: number): Trail {
  const latScale = 1 / 69;
  const lonScale = 1 / (69 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  const radius = distance / (2 * Math.PI);
  const steps = 24;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      lat: center.lat + Math.sin(angle) * radius * latScale * 69,
      lon: center.lon + Math.cos(angle) * radius * lonScale * 69,
    });
  }
  const names = ['Creekside Loop (sample)', 'Overlook Connector (sample)', 'Pine Ridge Walk (sample)', 'Meadow Path (sample)', 'Ridgeline Route (sample)', 'Wildflower Loop (sample)'];
  const difficulties: Trail['difficulty'][] = ['Easy', 'Moderate', 'Easy', 'Unknown', 'Hard', 'Moderate'];
  return {
    id: `sample-${center.lat.toFixed(3)}-${center.lon.toFixed(3)}-${id}`, 
    name: names[id % names.length],
    points,
    distanceMiles: distance,
    difficulty: difficulties[id % difficulties.length],
    surface: id % 2 === 0 ? 'Natural surface (illustrative)' : 'Mixed surface (illustrative)',
    foot: 'Unknown',
    description: 'Illustrative sample route for preview only. This is not a verified trail and must not be used for navigation.',
    source: 'Sample data',
  };
}

function fallbackTrails(center: Point): Trail[] {
  return [1.2, 2.4, 3.1, 4.7, 5.8, 7.2].map((distance, index) => sampleTrail(center, index, distance));
}

export type TrailResult = { trails: Trail[]; source: 'OpenStreetMap' | 'Sample data'; note?: string };

export async function loadTrails(place: Place): Promise<TrailResult> {
  const center = { lat: place.latitude, lon: place.longitude };
  const query = `[out:json][timeout:14];way(around:7000,${center.lat},${center.lon})["highway"~"path|footway|track|bridleway"]["name"];out tags geom 90;`;
  try {
    const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}`;
    const result = await fetchJson<{ elements?: unknown }>(url, 19000);
    const trails = parseOverpassWays(result.elements)
      .filter((way) => way.type === 'way' && way.tags?.name && way.geometry && way.geometry.length > 1)
      .map((way): Trail | null => {
        const points: Point[] = (way.geometry ?? []).map((point) => ({ lat: point.lat, lon: point.lon }));
        const miles = pathDistanceMiles(points);
        if (miles < 0.08 || miles > 20) return null;
        const tags = way.tags ?? {};
        return {
          id: `osm-${way.id}`,
          name: tags.name,
          points,
          distanceMiles: miles,
          difficulty: classifyDifficulty(tags),
          surface: tags.surface?.replaceAll('_', ' ') ?? 'Not specified on map',
          foot: tags.foot ?? 'Not specified',
          description: 'Mapped path segment from OpenStreetMap. The mapped segment may not represent the full hiking route.',
          source: 'OpenStreetMap',
        };
      })
      .filter((trail): trail is Trail => trail !== null)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, 36);

    if (trails.length) return { trails, source: 'OpenStreetMap' };
    return { trails: fallbackTrails(center), source: 'Sample data', note: 'No named mapped trail segments were returned near this location, so illustrative sample routes are shown.' };
  } catch {
    return { trails: fallbackTrails(center), source: 'Sample data', note: 'The open map service could not be reached. Illustrative sample routes are shown instead.' };
  }
}

export async function loadWeather(place: Place): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    forecast_days: '5',
    timezone: 'auto',
  }).toString();
  const data = await fetchJson<{
    timezone?: string;
    current: { temperature_2m: number; relative_humidity_2m: number; apparent_temperature: number; precipitation: number; weather_code: number; wind_speed_10m: number; is_day: number };
    daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; wind_speed_10m_max: number[] };
  }>(url.toString());
  return {
    timezone: data.timezone ?? 'Local time',
    current: {
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    days: data.daily.time.map((date, index) => ({
      date,
      code: data.daily.weather_code[index],
      high: data.daily.temperature_2m_max[index],
      low: data.daily.temperature_2m_min[index],
      precipitationProbability: data.daily.precipitation_probability_max[index] ?? 0,
      windMax: data.daily.wind_speed_10m_max[index] ?? 0,
    })),
  };
}

export const defaultPlace = FALLBACK_PLACE;
