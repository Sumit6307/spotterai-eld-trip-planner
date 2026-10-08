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
      box-shadow: 0 2px 8px rgba(0,0,0,0.6);
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
      width: 36px;
      height: 36px;
      background: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const STOP_COLORS = {
  fuel: '#f97316',
  rest: '#8b5cf6',
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
      map.fitBounds(bounds, { padding: [60, 60] });
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
    <div className="map-panel">
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

        {/* Route Outer Glow */}
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#6366f1',
            weight: 10,
            opacity: 0.25,
            smoothFactor: 1,
          }}
        />

        {/* Route main core line */}
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#4f46e5',
            weight: 5,
            opacity: 0.9,
            smoothFactor: 1,
          }}
        />

        {/* Start / Current location */}
        {locations?.current && (
          <Marker
            position={[locations.current.lat, locations.current.lng]}
            icon={createEmojiMarker('#3b82f6', '📍')}
          >
            <Popup>
              <div style={{ fontFamily: 'var(--font-sans)', padding: 4 }}>
                <strong style={{ color: '#3b82f6', fontSize: '0.9rem' }}>📍 Current Location (Trip Start)</strong>
                <div style={{ marginTop: 4, color: '#e2e8f0', fontSize: '0.82rem' }}>{locations.current.display_name}</div>
              </div>
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
              <div style={{ fontFamily: 'var(--font-sans)', padding: 4 }}>
                <strong style={{ color: '#06b6d4', fontSize: '0.9rem' }}>📦 Pickup Location</strong>
                <div style={{ marginTop: 4, color: '#e2e8f0', fontSize: '0.82rem' }}>{locations.pickup.display_name}</div>
                <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#94a3b8' }}>⏱ 1.0 hr On-Duty Loading Scheduled</div>
              </div>
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
              <div style={{ fontFamily: 'var(--font-sans)', padding: 4 }}>
                <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>🏁 Drop-off Destination</strong>
                <div style={{ marginTop: 4, color: '#e2e8f0', fontSize: '0.82rem' }}>{locations.dropoff.display_name}</div>
                <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#94a3b8' }}>⏱ 1.0 hr On-Duty Unloading Scheduled</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Intermediate HOS Stops */}
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
                <div style={{ fontFamily: 'var(--font-sans)', padding: 4 }}>
                  <strong style={{ color: color, fontSize: '0.9rem' }}>
                    {emoji} {stop.type?.toUpperCase()} STOP
                  </strong>
                  <div style={{ marginTop: 4, color: '#e2e8f0', fontSize: '0.82rem' }}>{stop.location_name}</div>
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    • Mile Marker: <strong>{stop.mile_marker} mi</strong><br />
                    • Duration: <strong>{stop.duration_hours} hr</strong><br />
                    • Reason: <em>{stop.reason}</em>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Legend */}
      <div className="map-floating-legend">
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#3b82f6' }}></div>
          Start
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#06b6d4' }}></div>
          Pickup (1h Load)
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#10b981' }}></div>
          Dropoff (1h Unload)
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#f97316' }}></div>
          Fuel (&lt;1,000 mi)
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#8b5cf6' }}></div>
          10-hr Rest (11h/14h Limit)
        </div>
        <div className="legend-row">
          <div className="legend-dot" style={{ background: '#eab308' }}></div>
          30-min Break (8h Drive)
        </div>
      </div>
    </div>
  );
}
