export default function TripSummary({ summary }) {
  if (!summary) return null;

  const items = [
    {
      label: 'Total Distance',
      val: `${summary.total_miles?.toLocaleString() || 0}`,
      sub: 'Miles (Real Highway)',
      icon: '🛣️',
      color: '#38bdf8',
    },
    {
      label: 'Driving Time',
      val: `${summary.total_driving_hours?.toFixed(1) || 0}`,
      sub: 'Hours behind wheel',
      icon: '🚛',
      color: '#818cf8',
    },
    {
      label: 'Total On-Duty',
      val: `${summary.total_on_duty_hours?.toFixed(1) || 0}`,
      sub: 'Hours (inc. 2h load/unload)',
      icon: '⏱️',
      color: '#fbbf24',
    },
    {
      label: 'Daily Log Sheets',
      val: `${summary.total_days || 1}`,
      sub: '24-hour FMCSA sheets',
      icon: '📋',
      color: '#34d399',
    },
    {
      label: 'Cycle Remaining',
      val: `${summary.remaining_cycle_hours?.toFixed(1) || 0}`,
      sub: 'of 70.0 hrs max limit',
      icon: '⏳',
      color: summary.remaining_cycle_hours < 15 ? '#f87171' : '#38bdf8',
    },
    {
      label: 'Fueling Stops',
      val: `${summary.fuel_stops || 0}`,
      sub: 'Every 1,000 mi rule',
      icon: '⛽',
      color: '#f97316',
    },
    {
      label: '10h Rest Breaks',
      val: `${summary.rest_stops || 0}`,
      sub: '11h drive / 14h window',
      icon: '🛏️',
      color: '#a78bfa',
    },
  ];

  return (
    <div className="kpi-grid">
      {items.map((it, idx) => (
        <div className="kpi-card" key={idx}>
          <div className="kpi-icon-badge" style={{ color: it.color }}>
            {it.icon}
          </div>
          <div className="kpi-value">{it.val}</div>
          <div className="kpi-label">{it.label}</div>
          <div className="kpi-sub">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}
