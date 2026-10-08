export default function StopsList({ stops }) {
  if (!stops || stops.length === 0) return null;

  return (
    <div>
      <h3 className="stops-list__title">
        <span>🛑</span> Route Stops & Planned Rest Schedule
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {stops.map((stop, idx) => {
          const type = stop.type || 'rest';
          return (
            <div className={`stop-item stop-item--${type}`} key={idx}>
              <span className={`stop-item__badge stop-item__badge--${type}`}>
                {getEmoji(type)} {type}
              </span>
              <div className="stop-item__info">
                <div className="stop-item__name">{stop.location_name || 'Designated Stop'}</div>
                <div className="stop-item__detail">
                  <strong>Mile {stop.mile_marker}</strong> • Duration: {stop.duration_hours} hr
                  {stop.reason && <span> • <em>{stop.reason}</em></span>}
                </div>
                {stop.arrival_time && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-accent)', marginTop: 2 }}>
                    ⏱ Planned Arrival: {formatDate(stop.arrival_time)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getEmoji(type) {
  switch (type) {
    case 'fuel': return '⛽';
    case 'rest': return '🛏️';
    case 'break': return '☕';
    case 'pickup': return '📦';
    case 'dropoff': return '🏁';
    default: return '📍';
  }
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}
