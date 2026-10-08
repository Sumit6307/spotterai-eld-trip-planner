import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCircleMarker(color, size = 14) {
  return L.divIcon({
    className: 'custom-dot-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createEmojiMarker(color, emoji) {
  return L.divIcon({
    className: 'custom-emoji-marker',
    html: `<div style="
      width: 34px;
      height: 34px;
      background: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.45);
    ">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

const STOP_COLORS = {
  fuel: '#f97316',
  rest: '#6366f1',
  break: '#eab308',
  pickup: '#06b6d4',
  dropoff: '#10b981',
};

const STOP_EMOJIS = {
  fuel: '⛽',
  rest: '🛏️',
  break: '☕',
  pickup: '📦',
  dropoff: '🏁',
};

function AutoFitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function RouteMap({ routeData, locations, stops }) {
  if (!routeData || !routeData.geometry) return null;

  const routePositions = routeData.geometry.map(([lng, lat]) => [lat, lng]);

  const bounds = routePositions.length > 0
    ? L.latLngBounds(routePositions).pad(0.08)
    : [[39.8, -98.5], [40.0, -98.4]];

  return (
    <div className="map-container">
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFitBounds bounds={bounds} />

        {/* Route main line */}
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#4f46e5',
            weight: 5,
            opacity: 0.85,
            smoothFactor: 1,
          }}
        />

        {/* Start / Current marker */}
        {locations?.current && (
          <Marker
            position={[locations.current.lat, locations.current.lng]}
            icon={createEmojiMarker('#3b82f6', '📍')}
          >
            <Popup>
              <strong>📍 Current Location (Start)</strong>
              <br />
              {locations.current.display_name}
            </Popup>
          </Marker>
        )}

        {/* Pickup marker */}
        {locations?.pickup && (
          <Marker
            position={[locations.pickup.lat, locations.pickup.lng]}
            icon={createEmojiMarker('#06b6d4', '📦')}
          >
            <Popup>
              <strong>📦 Pickup Location</strong>
              <br />
              {locations.pickup.display_name}
              <br />
              <small>1 hr Loading planned</small>
            </Popup>
          </Marker>
        )}

        {/* Dropoff marker */}
        {locations?.dropoff && (
          <Marker
            position={[locations.dropoff.lat, locations.dropoff.lng]}
            icon={createEmojiMarker('#10b981', '🏁')}
          >
            <Popup>
              <strong>🏁 Drop-off Destination</strong>
              <br />
              {locations.dropoff.display_name}
              <br />
              <small>1 hr Unloading planned</small>
            </Popup>
          </Marker>
        )}

        {/* Intermediate Stops (Fuel, Rest, 30m Break) */}
        {stops?.map((stop, idx) => {
          if (!stop.location || (stop.location[0] === 0 && stop.location[1] === 0)) return null;
          if (stop.type === 'pickup' || stop.type === 'dropoff') return null;

          const [lng, lat] = stop.location;
          const emoji = STOP_EMOJIS[stop.type] || '📌';
          const color = STOP_COLORS[stop.type] || '#8b5cf6';

          return (
            <Marker
              key={`stop-marker-${idx}`}
              position={[lat, lng]}
              icon={createCircleMarker(color, 14)}
            >
              <Popup>
                <strong>{emoji} {stop.type?.toUpperCase()} STOP</strong>
                <br />
                {stop.location_name}
                <br />
                <span style={{ fontSize: '0.8em', color: '#6b7280' }}>
                  Mile {stop.mile_marker} • {stop.duration_hours} hr • {stop.reason}
                </span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#3b82f6' }}></div>
          Start
        </div>
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#06b6d4' }}></div>
          Pickup (1 hr)
        </div>
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#10b981' }}></div>
          Dropoff (1 hr)
        </div>
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#f97316' }}></div>
          Fuel (&lt;1,000 mi)
        </div>
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#6366f1' }}></div>
          10-hr Rest (11h drive / 14h window)
        </div>
        <div className="map-legend__item">
          <div className="map-legend__dot" style={{ background: '#eab308' }}></div>
          30-min Break (8h drive)
        </div>
      </div>
    </div>
  );
}
