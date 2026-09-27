import { useState, useEffect, FormEvent, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { disasterService } from '../services/disaster.service';
import type { Disaster } from '../types';
import { Input, Textarea } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PickedLocation {
  name: string;
  latitude: number;
  longitude: number;
}

// Inner component that captures map clicks
function MapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface DisasterFormProps {
  mode: 'create' | 'edit';
}

export function DisasterFormPage({ mode }: DisasterFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === 'edit');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Map picker state
  const [showMap, setShowMap] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(null);
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && id) {
      disasterService
        .getOne(id)
        .then((res) => {
          const d: Disaster = res.data.data;
          setTitle(d.title);
          setDescription(d.description);
          setTags(d.tags.join(', '));
          setStatus(d.status);
          // Pre-set the picked location from existing disaster
          const [lng, lat] = d.location.coordinates;
          setPickedLocation({ name: d.location.name, latitude: lat, longitude: lng });
          setMarkerPos([lat, lng]);
        })
        .catch(() => setError('Failed to load disaster'))
        .finally(() => setIsFetching(false));
    }
  }, [mode, id]);

  // Reverse geocode using Nominatim (OpenStreetMap — free, no key)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'DisasterResponseApp/1.0' },
      });
      if (!res.ok) throw new Error('Nominatim error');
      const data = await res.json();

      // Build a human-readable name from address parts
      const addr = data.address ?? {};
      const parts = [
        addr.city || addr.town || addr.village || addr.county || addr.state_district,
        addr.state,
        addr.country,
      ].filter(Boolean);

      const locationName = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',').trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      setPickedLocation({ name: locationName, latitude: lat, longitude: lng });
    } catch {
      // Fallback: use coordinates as name
      setPickedLocation({ name: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`, latitude: lat, longitude: lng });
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setMarkerPos([lat, lng]);
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const clearLocation = () => {
    setPickedLocation(null);
    setMarkerPos(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsLoading(true);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      status,
      // Send explicit location if user picked one on the map
      ...(pickedLocation ? { location: pickedLocation } : {}),
    };

    try {
      if (mode === 'create') {
        const res = await disasterService.create(payload);
        navigate(`/disasters/${res.data.data._id}`);
      } else if (id) {
        await disasterService.update(id, payload);
        navigate(`/disasters/${id}`);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Array<{ field: string; message: string }> } } };
      const data = axiosErr.response?.data;
      if (data?.errors) {
        const fe: Record<string, string> = {};
        data.errors.forEach((e) => { fe[e.field] = e.message; });
        setFieldErrors(fe);
      }
      setError(data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <Loading text="Loading disaster..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">
        {mode === 'create' ? 'Create Disaster' : 'Edit Disaster'}
      </h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <form id="disaster-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            id="title-input"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Heavy Flooding in Mumbai"
            required
            error={fieldErrors.title}
          />

          <Textarea
            id="description-input"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the disaster. If you don't pick a location on the map, include a city name and the system will auto-resolve coordinates."
            rows={4}
            required
            error={fieldErrors.description}
          />

          {/* ── Location Section ─────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                📍 Location
              </span>
              <div className="flex items-center gap-2">
                {pickedLocation && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    ✕ Clear
                  </button>
                )}
                <button
                  type="button"
                  id="toggle-map-btn"
                  onClick={() => setShowMap((v) => !v)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-700/40 hover:bg-blue-600/30 transition-colors"
                >
                  {showMap ? '▲ Hide Map' : '🗺️ Pick on Map'}
                </button>
              </div>
            </div>

            {/* Picked location display */}
            {pickedLocation ? (
              <div className="rounded-lg border border-green-800 bg-green-900/20 p-3">
                {geocoding ? (
                  <p className="text-xs text-green-400 animate-pulse">🔍 Resolving location name…</p>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✅</span>
                    <div>
                      <p className="text-sm text-green-300 font-medium">{pickedLocation.name}</p>
                      <p className="text-xs text-green-600 font-mono mt-0.5">
                        {pickedLocation.latitude.toFixed(5)}°, {pickedLocation.longitude.toFixed(5)}°
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-3 space-y-1">
                <p className="text-xs text-blue-300">
                  💡 <strong>Pick on Map</strong> for precise location, or include a city name in your description for auto-resolution.
                </p>
                <p className="text-xs text-blue-400/60">
                  Supported: Mumbai, Delhi, Bangalore, New York, London, Tokyo, Dubai, São Paulo and 100+ cities worldwide.
                </p>
              </div>
            )}

            {/* Interactive map picker */}
            {showMap && (
              <div className="rounded-xl overflow-hidden border border-gray-700 mt-1">
                <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                  <span className="text-blue-400">🗺️</span>
                  Click anywhere on the map to set the disaster location. Location name is auto-resolved via OpenStreetMap.
                </div>
                <MapContainer
                  center={markerPos ?? [20, 0]}
                  zoom={markerPos ? 10 : 2}
                  style={{ height: '320px', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onPick={handleMapClick} />
                  {markerPos && <Marker position={markerPos} />}
                </MapContainer>
                {geocoding && (
                  <div className="bg-gray-800 px-3 py-1.5 text-xs text-blue-400 animate-pulse">
                    🔍 Resolving location name from OpenStreetMap…
                  </div>
                )}
              </div>
            )}
          </div>

          <Input
            id="tags-input"
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="flood, emergency, evacuation"
            error={fieldErrors.tags}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="status-select" className="text-sm font-medium text-gray-300">Status</label>
            <select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'RESOLVED')}
              className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="flex gap-3 pt-2">
            <Button
              id="submit-disaster-btn"
              type="submit"
              isLoading={isLoading}
              className="flex-1"
            >
              {mode === 'create' ? 'Create Disaster' : 'Save Changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
