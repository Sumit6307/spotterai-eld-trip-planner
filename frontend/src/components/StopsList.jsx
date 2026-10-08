export default function StopsList({ stops }) {
  if (!stops || stops.length === 0) return null;

  return (
    <div className="timeline-card">
      <h3 className="timeline-title">
        <span>🛑</span> Comprehensive Itinerary & Rest Schedule
      </h3>
      <div className="timeline-list">
        {stops.map((stop, idx) => {
          const type = stop.type || 'rest';
          return (
            <div className={`timeline-node timeline-node--${type}`} key={idx}>
              <span className={`node-badge node-badge--${type}`}>
                {getEmoji(type)} {type}
              </span>
              <div className="node-content">
                <div className="node-name">{stop.location_name || 'Designated Stop'}</div>
                <div className="node-detail">
                  <strong>Mile {stop.mile_marker}</strong> • Duration: {stop.duration_hours} hr
                  {stop.reason && <span> • <em>{stop.reason}</em></span>}
                </div>
                {stop.arrival_time && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', marginTop: 3, fontWeight: 600 }}>
                    🕐 Planned Arrival: {formatDate(stop.arrival_time)}
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
      weekday: 'short',
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
