export default function TripSummary({ summary }) {
  if (!summary) return null;

  const items = [
    { label: 'Total Distance', val: `${summary.total_miles?.toLocaleString() || 0}`, unit: 'miles', icon: '🛣️' },
    { label: 'Driving Time', val: `${summary.total_driving_hours?.toFixed(1) || 0}`, unit: 'hours', icon: '🚚' },
    { label: 'Total On Duty', val: `${summary.total_on_duty_hours?.toFixed(1) || 0}`, unit: 'hours', icon: '⏱️' },
    { label: 'Log Sheets Needed', val: `${summary.total_days || 1}`, unit: 'days (24h)', icon: '📋' },
    { label: 'Cycle Remaining', val: `${summary.remaining_cycle_hours?.toFixed(1) || 0}`, unit: 'of 70.0 hrs', icon: '⏳' },
    { label: 'Planned Fuel Stops', val: `${summary.fuel_stops || 0}`, unit: '<1,000 mi rule', icon: '⛽' },
    { label: 'Required 10h Rests', val: `${summary.rest_stops || 0}`, unit: '11h/14h rule', icon: '🛏️' },
  ];

  return (
    <div className="summary-grid">
      {items.map((it, idx) => (
        <div className="summary-card" key={idx}>
          <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>{it.icon}</div>
          <div className="summary-card__value">{it.val}</div>
          <div className="summary-card__label">
            <span style={{ opacity: 0.85, fontWeight: 400 }}>{it.unit}</span>
            <br />
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
