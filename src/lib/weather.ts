export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain showers';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Conditions unavailable';
}

export function weatherAdvice(code: number, precipProbability = 0, wind = 0, apparentTemp = 18): { level: 'Good' | 'Use caution' | 'Higher risk'; message: string } {
  if ([95, 96, 99].includes(code)) return { level: 'Higher risk', message: 'Thunderstorm risk is present in the forecast. Consider postponing exposed hikes and check local alerts.' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { level: 'Use caution', message: 'Snow or wintry precipitation may affect footing and visibility. Check trail-specific and local conditions.' };
  if (precipProbability >= 65 || wind >= 45 || apparentTemp >= 35 || apparentTemp <= -10) {
    return { level: 'Higher risk', message: 'Forecast conditions may be challenging. Review local advisories, gear needs, and a conservative turnaround plan.' };
  }
  if (precipProbability >= 35 || wind >= 30 || apparentTemp >= 30 || apparentTemp <= 0 || [45, 48].includes(code)) {
    return { level: 'Use caution', message: 'Conditions may require extra planning. Bring appropriate layers, check local updates, and be ready to change plans.' };
  }
  return { level: 'Good', message: 'No major weather flag detected from this forecast snapshot. This is not a safety guarantee; check official alerts and trail conditions.' };
}
