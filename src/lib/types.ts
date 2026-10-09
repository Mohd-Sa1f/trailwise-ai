export type Point = { lat: number; lon: number };
export type Difficulty = 'Easy' | 'Moderate' | 'Hard' | 'Unknown';
export type TrailSource = 'OpenStreetMap' | 'Sample data';

export type Trail = {
  id: string;
  name: string;
  points: Point[];
  distanceMiles: number;
  difficulty: Difficulty;
  surface: string;
  foot: string;
  description: string;
  source: TrailSource;
};

export type Place = {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export type WeatherNow = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherDay = {
  date: string;
  code: number;
  high: number;
  low: number;
  precipitationProbability: number;
  windMax: number;
};

export type WeatherData = { current: WeatherNow; days: WeatherDay[]; timezone: string };
