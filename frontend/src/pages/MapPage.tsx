import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Disaster, Resource } from '../types';
import { disasterService } from '../services/disaster.service';
import { useSocket } from '../hooks/useSocket';

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Color-coded icons for different resource types
const resourceColors: Record<string, string> = {
  SHELTER: '#3b82f6',
  HOSPITAL: '#ef4444',
  FOOD: '#f59e0b',
  WATER: '#06b6d4',
  RESCUE: '#8b5cf6',
};

const resourceEmoji: Record<string, string> = {
  SHELTER: '🏠',
  HOSPITAL: '🏥',
  FOOD: '🍽️',
  WATER: '💧',
  RESCUE: '🚁',
};

function makeDisasterIcon(status: string) {
  const color = status === 'ACTIVE' ? '#ef4444' : '#6b7280';
  return L.divIcon({
    html: `<div style="width:30px;height:30px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
    className: '',
  });
}

function makeResourceIcon(type: string) {
  const color = resourceColors[type] ?? '#64748b';
  const emoji = resourceEmoji[type] ?? '📍';
  return L.divIcon({
    html: `<div style="width:32px;height:32px;background:${color};border:2px solid white;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    className: '',
  });
}

// Recenter map when selected disaster changes
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 8, { animate: true });
    }
  }, [center, map]);
  return null;
}

export function MapPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [radiusInput, setRadiusInput] = useState<string>('50');
  const radiusKm = Number(radiusInput) || 50;
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  const { lastEvent } = useSocket();

  const fetchDisasters = async () => {
    try {
      const res = await disasterService.getAll({ limit: 100 });
      setDisasters(res.data.data.disasters);
    } catch {
      // silently fail — map still renders
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisasters();
  }, []);

  useEffect(() => {
    if (lastEvent) {
      fetchDisasters();
    }
  }, [lastEvent]);

  const handleDisasterClick = async (disaster: Disaster, overrideRadius?: number) => {
    const searchRadius = overrideRadius ?? radiusKm;
    setSelectedDisaster(disaster);
    const [lng, lat] = disaster.location.coordinates;
    setMapCenter([lat, lng]);
    setResources([]);
    setResourcesLoading(true);
    try {
      const res = await disasterService.getNearbyResources(disaster._id, lat, lng, searchRadius);
      const resources: Resource[] = res.data.data;
      setResources(Array.isArray(resources) ? resources : []);
    } catch {
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const defaultCenter: [number, number] = [20, 0];

  return (
    <div className="flex h-[calc(100vh-56px)] bg-gray-950">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 overflow-y-auto scrollbar-hide border-r border-gray-800 bg-gray-900">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-gray-100">🗺️ Disaster Map</h1>
          <p className="text-xs text-gray-400 mt-1">
            Click a disaster to see it on the map and load nearby resources.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500 text-sm">Loading disasters...</div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {disasters.map((d) => (
              <li
                key={d._id}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-800 ${
                  selectedDisaster?._id === d._id ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                }`}
                onClick={() => handleDisasterClick(d)}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-block w-3 h-3 rounded-full flex-shrink-0 ${
                      d.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{d.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      📍 {d.location.name} <span className="font-mono text-[10px] opacity-70">({d.location.coordinates[1].toFixed(4)}°, {d.location.coordinates[0].toFixed(4)}°)</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Resource panel */}
        {selectedDisaster && (
          <div className="p-4 border-t border-gray-700 bg-gray-950">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Nearby Resources {resourcesLoading && <span className="ml-2 animate-pulse text-blue-500">...</span>}
              </h2>
              <div className="flex items-center">
                <input
                  type="text"
                  value={radiusInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setRadiusInput(val);
                    handleDisasterClick(selectedDisaster, Number(val) || 50);
                  }}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-[10px] rounded-l px-1.5 py-0.5 w-12 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="bg-gray-700 border border-gray-700 text-gray-400 text-[10px] rounded-r px-1.5 py-0.5 border-l-0">km</span>
              </div>
            </div>
            {resources.length === 0 && !resourcesLoading ? (
              <p className="text-xs text-gray-500">No resources found within {radiusKm}km.</p>
            ) : (
              <ul className={`space-y-2 ${resourcesLoading ? 'opacity-50' : ''}`}>
                {resources.map((r) => (
                  <li
                    key={String(r._id)}
                    className="flex items-start gap-2 text-xs text-gray-300"
                  >
                    <span>{resourceEmoji[r.type] ?? '📍'}</span>
                    <div>
                      <p className="font-medium">{r.name}</p>
                      {r.distance_km !== undefined && (
                        <p className="text-gray-500">{r.distance_km} km away</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* Map */}
      <div className="flex-1 relative">
        {/* Legend */}
        <div className="absolute top-3 right-3 z-[1000] bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-xl">
          <p className="font-semibold text-gray-300 mb-2">Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-gray-400">Active Disaster</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
              <span className="text-gray-400">Resolved Disaster</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">🏠</span>
              <span className="text-gray-400">Shelter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">🏥</span>
              <span className="text-gray-400">Hospital</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">🍽️</span>
              <span className="text-gray-400">Food</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">💧</span>
              <span className="text-gray-400">Water</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">🚁</span>
              <span className="text-gray-400">Rescue</span>
            </div>
          </div>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={2}
          className="h-full w-full"
          ref={selectedMarkerRef as unknown as React.Ref<L.Map>}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapCenter && <MapController center={mapCenter} />}

          {/* Disaster markers */}
          {disasters.map((d) => {
            const [lng, lat] = d.location.coordinates;
            return (
              <Marker
                key={d._id}
                position={[lat, lng]}
                icon={makeDisasterIcon(d.status)}
                eventHandlers={{ click: () => handleDisasterClick(d) }}
              >
                <Popup className="disaster-popup">
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          d.status === 'ACTIVE' ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                      />
                      <strong className="text-gray-900">{d.title}</strong>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      📍 {d.location.name} <br/>
                      <span className="font-mono text-[10px] text-gray-400">({lat.toFixed(4)}°, {lng.toFixed(4)}°)</span>
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">{d.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {d.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* 50km radius circle for selected disaster */}
          {selectedDisaster && (() => {
            const [lng, lat] = selectedDisaster.location.coordinates;
            return (
              <Circle
                center={[lat, lng]}
                radius={radiusKm * 1000}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.06, weight: 1.5, dashArray: '6 4' }}
              />
            );
          })()}

          {/* Resource markers */}
          {resources.map((r) => {
            const [lng, lat] = r.location.coordinates;
            return (
              <Marker key={String(r._id)} position={[lat, lng]} icon={makeResourceIcon(r.type)}>
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.type}</p>
                    {r.distance_km !== undefined && (
                      <p className="text-xs text-blue-600 mt-1">📏 {r.distance_km} km away</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
