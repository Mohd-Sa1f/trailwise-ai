import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle, ArrowDownUp, ArrowRight, Bookmark, BookmarkCheck, Check, ChevronDown,
  CircleHelp, Clock3, Cloud, CloudRain, Compass, Droplets, Footprints, Heart, Info,
  LoaderCircle, LocateFixed, MapPin, Menu, Mountain, Navigation, Route, Search, Send, SlidersHorizontal,
  Sparkles, Sun, Wind, X,
} from 'lucide-react';
import TrailMap from './components/TrailMap';
import { defaultPlace, loadTrails, loadWeather, placeLabel, searchPlaces } from './lib/api';
import { filterTrails, scoreTrail } from './lib/geo';
import { weatherAdvice, weatherLabel } from './lib/weather';
import type { Place, Trail, WeatherData } from './lib/types';

const MAX_MILES_OPTIONS = [
  { label: 'Any distance', value: 30 },
  { label: 'Under 3 mi', value: 3 },
  { label: 'Under 5 mi', value: 5 },
  { label: 'Under 8 mi', value: 8 },
];
const DIFFICULTIES = ['Any', 'Easy', 'Moderate', 'Hard'] as const;
type DifficultyFilter = (typeof DIFFICULTIES)[number];

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(`${date}T12:00:00`));
}
function formatMiles(miles: number): string {
  return miles < 10 ? miles.toFixed(1) : Math.round(miles).toString();
}
function riskClass(level: string): string {
  return level.toLowerCase().replaceAll(' ', '-');
}
function timeEstimate(miles: number): string {
  const minutes = Math.round(miles * 30);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
function trailReason(trail: Trail, maxMiles: number, difficulty: string): string {
  const reasons: string[] = [];
  if (trail.distanceMiles <= maxMiles) reasons.push('fits your distance');
  if (difficulty !== 'Any' && trail.difficulty === difficulty) reasons.push(`${trail.difficulty.toLowerCase()} difficulty`);
  if (trail.difficulty === 'Unknown') reasons.push('difficulty not mapped');
  return reasons.length ? reasons.join(' · ') : 'matches your current filters';
}

export default function App() {
  const [place, setPlace] = useState<Place>(defaultPlace);
  const [locationText, setLocationText] = useState(placeLabel(defaultPlace));
  const [placeOptions, setPlaceOptions] = useState<Place[]>([]);
  const [showPlaceOptions, setShowPlaceOptions] = useState(false);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [trailNote, setTrailNote] = useState('');
  const [weatherError, setWeatherError] = useState('');
  const [maxMiles, setMaxMiles] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('Any');
  const [query, setQuery] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [assistantInput, setAssistantInput] = useState('Find an easy trail under 3 miles for a relaxed morning.');
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('trailwise-saved-trails') ?? '[]') as string[]; }
    catch { return []; }
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    try { localStorage.setItem('trailwise-saved-trails', JSON.stringify(savedIds)); } catch { /* Storage may be disabled. */ }
  }, [savedIds]);

  const refreshLocationData = useCallback(async (nextPlace: Place) => {
    setPlace(nextPlace);
    setLocationText(placeLabel(nextPlace));
    setShowPlaceOptions(false);
    setPlaceOptions([]);
    setLoadingTrails(true);
    setLoadingWeather(true);
    setWeatherError('');
    setTrailNote('');
    setAssistantText('');
    setSelectedId(null);
    const [trailResult, weatherResult] = await Promise.allSettled([loadTrails(nextPlace), loadWeather(nextPlace)]);
    if (trailResult.status === 'fulfilled') {
      setTrails(trailResult.value.trails);
      setTrailNote(trailResult.value.note ?? '');
    } else {
      setTrails([]);
      setTrailNote('Trail data could not be loaded. Try again in a moment.');
    }
    if (weatherResult.status === 'fulfilled') setWeather(weatherResult.value);
    else { setWeather(null); setWeatherError('Forecast temporarily unavailable.'); }
    setLoadingTrails(false);
    setLoadingWeather(false);
    setStatusMessage(`Updated results for ${nextPlace.name}.`);
  }, []);

  useEffect(() => {
    void refreshLocationData(defaultPlace);
  }, [refreshLocationData]);

  const visibleTrails = useMemo(() => {
    const filtered = filterTrails(trails, { maxMiles, difficulty, query });
    return showSavedOnly ? filtered.filter((trail) => savedIds.includes(trail.id)) : filtered;
  }, [trails, maxMiles, difficulty, query, showSavedOnly, savedIds]);

  useEffect(() => {
    if (visibleTrails.length && !visibleTrails.some((trail) => trail.id === selectedId)) setSelectedId(visibleTrails[0].id);
    if (!visibleTrails.length) setSelectedId(null);
  }, [visibleTrails, selectedId]);

  const selectedTrail = visibleTrails.find((trail) => trail.id === selectedId) ?? null;
  const currentWeather = weather?.current;
  const weatherRisk = currentWeather ? weatherAdvice(currentWeather.weatherCode, weather.days[0]?.precipitationProbability ?? 0, currentWeather.windSpeed, currentWeather.apparentTemperature) : null;

  const handlePlaceSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const cleaned = locationText.trim();
    if (cleaned.length < 2) return;
    setSearchingPlace(true);
    setStatusMessage('');
    try {
      const options = await searchPlaces(cleaned);
      if (!options.length) {
        setStatusMessage('No matching places found. Try adding a city and state or country.');
        setPlaceOptions([]);
        setShowPlaceOptions(false);
      } else if (options.length === 1) {
        await refreshLocationData(options[0]);
      } else {
        setPlaceOptions(options);
        setShowPlaceOptions(true);
      }
    } catch {
      setStatusMessage('Location search is temporarily unavailable. Check your connection and try again.');
    } finally { setSearchingPlace(false); }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Location access is not supported by this browser. Search for a place instead.');
      return;
    }
    setStatusMessage('Requesting your location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: Place = { name: 'Your location', admin1: 'GPS', latitude: position.coords.latitude, longitude: position.coords.longitude };
        void refreshLocationData(next);
      },
      () => setStatusMessage('We could not access your location. Allow location permission or search for a place.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const toggleSaved = (trail: Trail) => {
    setSavedIds((current) => current.includes(trail.id) ? current.filter((id) => id !== trail.id) : [...current, trail.id]);
    setStatusMessage(savedIds.includes(trail.id) ? 'Trail removed from saved list.' : 'Trail saved on this device.');
  };

  const askGuide = () => {
    const prompt = assistantInput.trim();
    if (!prompt) return;
    const normalized = prompt.toLowerCase();
    setQuery('');
    let nextDifficulty: DifficultyFilter = 'Any';
    if (normalized.includes('easy') || normalized.includes('beginner') || normalized.includes('relaxed')) nextDifficulty = 'Easy';
    else if (normalized.includes('moderate') || normalized.includes('intermediate')) nextDifficulty = 'Moderate';
    else if (normalized.includes('hard') || normalized.includes('challenging') || normalized.includes('advanced')) nextDifficulty = 'Hard';
    let nextMaxMiles = 30;
    const distanceMatch = normalized.match(/(?:under|less than|within|up to)\s*(\d+(?:\.\d+)?)\s*(?:miles?|mi)?/);
    if (distanceMatch) nextMaxMiles = Number(distanceMatch[1]);
    else if (normalized.includes('short') || normalized.includes('quick')) nextMaxMiles = 3;
    else if (normalized.includes('long') || normalized.includes('all day')) nextMaxMiles = 15;
    setDifficulty(nextDifficulty);
    setMaxMiles(nextMaxMiles);
    const candidates = filterTrails(trails, { maxMiles: nextMaxMiles, difficulty: nextDifficulty, query: '' })
      .sort((a, b) => scoreTrail(b, { maxMiles: nextMaxMiles, difficulty: nextDifficulty, query: prompt }) - scoreTrail(a, { maxMiles: nextMaxMiles, difficulty: nextDifficulty, query: prompt }));
    if (!candidates.length) {
      setAssistantText(`I couldn't find a mapped trail matching those preferences in the current results near ${place.name}. Try a wider distance or choose “Any difficulty.” The data may be incomplete, so this does not mean no trails exist.`);
      return;
    }
    const picks = candidates.slice(0, 3);
    setSelectedId(picks[0].id);
    setAssistantText(`Based on your request, I found ${candidates.length} matching ${candidates.length === 1 ? 'option' : 'options'} near ${place.name}. ${picks.map((trail, index) => `${index + 1}. ${trail.name} (${formatMiles(trail.distanceMiles)} mi, ${trail.difficulty.toLowerCase()} difficulty)`).join('; ')}. ${picks[0].source === 'Sample data' ? 'These are illustrative sample routes, not verified trails, so do not use them for navigation.' : 'Distances describe mapped segments and may not represent the full trail. Check official trail information before heading out.'}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="TrailWise home">
          <span className="brand-mark"><Mountain size={20} strokeWidth={2.3} /></span>
          <span className="brand-name">trailwise<span>ai</span></span>
        </a>
        <nav className={mobileMenuOpen ? 'nav-links nav-open' : 'nav-links'}>
          <a className="nav-link nav-link-active" href="#explore">Explore</a>
          <a className="nav-link" href="#forecast">Conditions</a>
          <a className="nav-link" href="#guide">Trail guide</a>
        </nav>
        <div className="topbar-actions">
          <button className={`saved-nav ${showSavedOnly ? 'saved-nav-active' : ''}`} onClick={() => { setShowSavedOnly((current) => !current); setMobileMenuOpen(false); }} aria-pressed={showSavedOnly}>
            <Heart size={16} fill={showSavedOnly ? 'currentColor' : 'none'} /> <span>Saved</span> <span className="saved-count">{savedIds.length}</span>
          </button>
          <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((value) => !value)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="avatar" title="TrailWise explorer">TW</div>
        </div>
      </header>

      <main id="top" className="main-content">
        <section className="hero-row">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT OUTSIDE STARTS HERE</div>
            <h1>Find your trail.<br /><em>Feel ready.</em></h1>
            <p className="hero-description">Explore trails, check the forecast, and find a route that fits the day you want to have.</p>
          </div>
          <div className="hero-aside">
            <div className="hero-aside-icon"><Compass size={22} /></div>
            <div><strong>Better days outside</strong><span>Local maps. Weather context. Thoughtful planning.</span></div>
          </div>
        </section>

        <section className="search-panel" aria-label="Search for hiking trails">
          <form className="place-search" onSubmit={handlePlaceSearch}>
            <div className="search-field-icon"><MapPin size={18} /></div>
            <label className="search-input-wrap"><span>WHERE TO?</span><input value={locationText} onChange={(event) => { setLocationText(event.target.value); setShowPlaceOptions(false); }} placeholder="Search city, park, or region" aria-label="Search city, park, or region" /></label>
            <button className="locate-button" type="button" title="Use my current location" onClick={useMyLocation}><LocateFixed size={17} /><span>Near me</span></button>
            <button className="search-submit" type="submit" disabled={searchingPlace}>{searchingPlace ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}<span>Find trails</span></button>
          </form>
          {showPlaceOptions && placeOptions.length > 0 && (
            <div className="place-options" role="listbox" aria-label="Location search results">
              {placeOptions.map((option, index) => <button key={`${option.latitude}-${option.longitude}-${index}`} onClick={() => void refreshLocationData(option)} className="place-option"><MapPin size={16} /><span>{placeLabel(option)}</span><ArrowRight size={15} /></button>)}
            </div>
          )}
          {statusMessage && <div className="status-message" role="status">{statusMessage}</div>}
        </section>

        <section className="summary-strip" aria-label="Current search summary">
          <div className="summary-place"><span className="summary-pin"><MapPin size={16} /></span><div><strong>{place.name}</strong><span>{[place.admin1, place.country].filter(Boolean).join(', ') || 'Selected location'}</span></div></div>
          <div className="summary-divider" />
          <div className="summary-metric"><Footprints size={17} /><div><strong>{loadingTrails ? '…' : trails.length}</strong><span>{trails.length === 1 ? 'route found' : 'routes found'}</span></div></div>
          <div className="summary-divider" />
          <div className="summary-metric"><Bookmark size={17} /><div><strong>{savedIds.length}</strong><span>saved trails</span></div></div>
          <div className="summary-right"><span className="live-dot" /> {trails.some((trail) => trail.source === 'OpenStreetMap') ? 'Open map data' : 'Preview mode'}</div>
        </section>

        <div className="workspace-grid" id="explore">
          <section className="results-column" aria-label="Trail results">
            <div className="section-heading results-heading">
              <div><div className="section-kicker">THE SHORTLIST</div><h2>{showSavedOnly ? 'Your saved trails' : 'Trails around you'} <span className="count-pill">{visibleTrails.length}</span></h2></div>
              <button className="filter-icon-button" onClick={() => { setMaxMiles(30); setDifficulty('Any'); setQuery(''); setShowSavedOnly(false); }} title="Reset all filters"><SlidersHorizontal size={17} /><span>Reset</span></button>
            </div>

            <div className="filter-panel">
              <div className="filter-label"><ArrowDownUp size={15} /><span>DISTANCE</span></div>
              <div className="pill-options distance-options">{MAX_MILES_OPTIONS.map((option) => <button key={option.value} className={`filter-pill ${maxMiles === option.value ? 'filter-pill-active' : ''}`} onClick={() => setMaxMiles(option.value)}>{option.label}</button>)}</div>
              <div className="filter-separator" />
              <div className="filter-label"><Footprints size={15} /><span>DIFFICULTY</span></div>
              <div className="pill-options">{DIFFICULTIES.map((item) => <button key={item} className={`filter-pill ${difficulty === item ? 'filter-pill-active' : ''}`} onClick={() => setDifficulty(item)}>{item}</button>)}</div>
              <div className="filter-search"><Search size={15} /><input aria-label="Filter trails by name or surface" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by trail name…" /><ChevronDown size={14} className="filter-search-chevron" /></div>
            </div>

            {trailNote && <div className="data-note"><Info size={16} /><span>{trailNote}</span></div>}
            {loadingTrails ? <div className="loading-card"><LoaderCircle className="spin" size={24} /><strong>Finding trails nearby…</strong><span>Checking open map data for named trail segments.</span></div> : visibleTrails.length ? (
              <div className="trail-list">
                {visibleTrails.map((trail, index) => (
                  <article key={trail.id} className={`trail-card ${trail.id === selectedId ? 'trail-card-selected' : ''}`} onClick={() => setSelectedId(trail.id)}>
                    <button className="trail-card-main" onClick={() => setSelectedId(trail.id)} aria-label={`Select ${trail.name}`}>
                      <span className={`trail-thumb trail-thumb-${index % 4}`}><Mountain size={25} strokeWidth={1.65} /><span className="thumb-stamp">{trail.difficulty === 'Unknown' ? 'MAP' : trail.difficulty.toUpperCase()}</span></span>
                      <span className="trail-copy"><span className="trail-title-line"><strong>{trail.name}</strong>{trail.id === selectedId && <span className="selected-tag"><Check size={11} /> SELECTED</span>}</span><span className="trail-meta"><span><Route size={13} /> {formatMiles(trail.distanceMiles)} mi segment</span><span><Clock3 size={13} /> ~{timeEstimate(trail.distanceMiles)}</span></span><span className="trail-footnote">{trailReason(trail, maxMiles, difficulty)}</span></span>
                    </button>
                    <div className="trail-card-side"><span className={`difficulty-label difficulty-${trail.difficulty.toLowerCase()}`}>{trail.difficulty}</span><button className={`bookmark-button ${savedIds.includes(trail.id) ? 'bookmark-button-saved' : ''}`} aria-label={savedIds.includes(trail.id) ? 'Remove saved trail' : 'Save trail'} onClick={(event) => { event.stopPropagation(); toggleSaved(trail); }}>{savedIds.includes(trail.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-icon"><Compass size={24} /></div><strong>No trails match those filters</strong><p>Try a wider distance, another difficulty, or search a nearby location.</p><button className="text-button" onClick={() => { setMaxMiles(30); setDifficulty('Any'); setQuery(''); setShowSavedOnly(false); }}>Clear filters <ArrowRight size={14} /></button></div>
            )}
            {!loadingTrails && trails.length > 0 && <p className="source-footnote">Trail data: {trails.some((trail) => trail.source === 'OpenStreetMap') ? <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> : 'illustrative sample data'}. Trail lengths are estimates of mapped segments, not verified full-route distances.</p>}
          </section>

          <section className="map-column" aria-label="Trail map and conditions">
            <div className="map-card">
              <div className="map-card-heading"><div><div className="section-kicker">GET YOUR BEARINGS</div><h2>Explore the area</h2></div><span className="map-layer-tag"><span className="live-dot" /> Map view</span></div>
              <div className="map-frame"><TrailMap center={{ lat: place.latitude, lon: place.longitude }} trails={visibleTrails} selectedId={selectedId} onSelect={setSelectedId} /><div className="map-compass"><Navigation size={17} /><span>N</span></div><div className="map-legend"><span><i className="legend-line legend-active" /> Selected</span><span><i className="legend-line" /> Trail segment</span></div></div>
              {selectedTrail ? <div className="map-selected-trail"><div className="selected-trail-icon"><Route size={17} /></div><div className="selected-trail-info"><span>SELECTED MAP SEGMENT</span><strong>{selectedTrail.name}</strong><small>{formatMiles(selectedTrail.distanceMiles)} mi · {selectedTrail.difficulty} · {selectedTrail.source}</small></div><button className="circle-arrow" title="Show on map" onClick={() => setSelectedId(selectedTrail.id)}><ArrowRight size={17} /></button></div> : <div className="map-empty-overlay"><MapPin size={18} /> Select a trail to view its mapped segment.</div>}
            </div>

            <section className="weather-card" id="forecast">
              <div className="weather-heading"><div><div className="section-kicker">CHECK BEFORE YOU GO</div><h2>Right now</h2></div><span className="weather-location"><MapPin size={13} /> {place.name}</span></div>
              {loadingWeather ? <div className="weather-loading"><LoaderCircle className="spin" size={21} /><span>Loading local forecast…</span></div> : weather && currentWeather ? <>
                <div className="weather-current"><div className="weather-current-icon">{currentWeather.weatherCode >= 51 ? <CloudRain size={30} /> : currentWeather.weatherCode >= 2 ? <Cloud size={30} /> : <Sun size={30} />}</div><div className="weather-temp"><strong>{Math.round(currentWeather.temperature)}°</strong><span>{weatherLabel(currentWeather.weatherCode)}</span></div><div className="feels-like"><span>FEELS LIKE</span><strong>{Math.round(currentWeather.apparentTemperature)}°C</strong></div></div>
                <div className="weather-metrics"><div><Droplets size={15} /><span>Humidity</span><strong>{Math.round(currentWeather.humidity)}%</strong></div><div><CloudRain size={15} /><span>Precip.</span><strong>{currentWeather.precipitation.toFixed(1)} mm</strong></div><div><Wind size={15} /><span>Wind</span><strong>{Math.round(currentWeather.windSpeed)} km/h</strong></div></div>
                {weatherRisk && <div className={`risk-panel risk-${riskClass(weatherRisk.level)}`}><span className="risk-symbol">{weatherRisk.level === 'Good' ? <Check size={17} /> : <AlertTriangle size={17} />}</span><div><strong>{weatherRisk.level === 'Good' ? 'Forecast snapshot looks favorable' : weatherRisk.level}</strong><p>{weatherRisk.message}</p></div></div>}
                <div className="forecast-strip"><div className="forecast-title">5-day outlook</div><div className="forecast-days">{weather.days.slice(0, 5).map((day) => <div key={day.date} className="forecast-day"><span>{dateLabel(day.date)}</span><span className="forecast-icon">{day.code >= 51 ? <CloudRain size={17} /> : day.code >= 2 ? <Cloud size={17} /> : <Sun size={17} />}</span><strong>{Math.round(day.high)}°</strong><small>{Math.round(day.low)}°</small><span className="forecast-rain"><Droplets size={10} />{day.precipitationProbability}%</span></div>)}</div></div>
              </> : <div className="weather-error"><Cloud size={21} /><span>{weatherError || 'Forecast unavailable right now.'}</span><button onClick={() => void refreshLocationData(place)}>Retry</button></div>}
              <p className="weather-source">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>. Forecasts are estimates, not official trail alerts.</p>
            </section>
          </section>
        </div>

        <section className={`guide-card ${assistantOpen ? 'guide-card-open' : ''}`} id="guide">
          <div className="guide-topline"><span className="guide-icon"><Sparkles size={20} /></span><div className="guide-title"><div className="section-kicker">A LITTLE HELP PLANNING</div><h2>Ask the TrailWise guide</h2><p>Describe the hike you have in mind. The guide matches your words to available trail data and explains its picks.</p></div><button className="guide-toggle" onClick={() => setAssistantOpen((open) => !open)} aria-expanded={assistantOpen}>{assistantOpen ? 'Hide guide' : 'Open guide'} <ChevronDown size={16} className={assistantOpen ? 'rotate-chevron' : ''} /></button></div>
          {assistantOpen && <div className="guide-content"><form className="guide-prompt" onSubmit={(event) => { event.preventDefault(); askGuide(); }}><div className="prompt-sparkle"><Sparkles size={17} /></div><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} aria-label="Ask for a trail recommendation" placeholder="e.g. A moderate hike under 5 miles, avoid rain…" /><button type="submit" disabled={loadingTrails || !trails.length}><span>Find my fit</span><Send size={15} /></button></form><div className="suggestion-chips"><span>TRY ASKING</span><button onClick={() => setAssistantInput('Find an easy trail under 3 miles')}>Easy + under 3 mi</button><button onClick={() => setAssistantInput('Find a challenging hike over 5 miles')}>A bigger challenge</button><button onClick={() => setAssistantInput('Find a short flat walk')}>Short + flat</button></div>{assistantText && <div className="assistant-answer"><div className="assistant-answer-icon"><Sparkles size={16} /></div><div><strong>TrailWise recommendation</strong><p>{assistantText}</p></div></div>}<div className="guide-disclaimer"><Info size={14} /> This prototype uses transparent preference matching, not a hosted large language model. It only reasons over currently loaded trail metadata and forecast data.</div></div>}
        </section>

        <section className="bottom-note"><div className="bottom-note-icon"><CircleHelp size={19} /></div><p><strong>Go prepared, come back happy.</strong><span>Map data can be incomplete or out of date. Verify closures, permits, weather warnings, and route details with local land managers before setting out.</span></p><a href="https://www.ready.gov/" target="_blank" rel="noreferrer">Trip safety <ArrowRight size={14} /></a></section>
        <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Mountain size={17} /></span><span className="brand-name">trailwise<span>ai</span></span></a><span>Made for more thoughtful days outside.</span><div><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a><span>·</span><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a><span>·</span><a href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a></div></footer>
      </main>
    </div>
  );
}
