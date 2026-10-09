import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Point, Trail } from '../lib/types';

function MapRecenter({ center, zoom }: { center: Point; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lon], zoom, { duration: 0.8 });
  }, [center.lat, center.lon, map, zoom]);
  return null;
}

export default function TrailMap({ center, trails, selectedId, onSelect }: {
  center: Point;
  trails: Trail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={[center.lat, center.lon]} zoom={12} scrollWheelZoom className="trail-map">
      <MapRecenter center={center} zoom={12} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trails.map((trail) => {
        const positions = trail.points.map((point) => [point.lat, point.lon] as [number, number]);
        if (positions.length < 2) return null;
        const active = trail.id === selectedId;
        return (
          <Polyline
            key={trail.id}
            positions={positions}
            pathOptions={{ color: active ? '#d46a43' : '#2e6d55', weight: active ? 6 : 3, opacity: active ? 0.95 : 0.55, lineCap: 'round' }}
            eventHandlers={{ click: () => onSelect(trail.id) }}
          >
            <Tooltip sticky>{trail.name}</Tooltip>
          </Polyline>
        );
      })}
      <CircleMarker center={[center.lat, center.lon]} radius={6} pathOptions={{ color: '#fff', weight: 3, fillColor: '#d46a43', fillOpacity: 1 }}>
        <Tooltip direction="top">Search center</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
