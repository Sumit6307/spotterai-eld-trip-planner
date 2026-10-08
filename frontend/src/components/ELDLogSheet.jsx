import { useRef, useEffect, useState } from 'react';
import { drawELDLog } from '../utils/eldDrawing';

export default function ELDLogSheet({ dailyLogs }) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  if (!dailyLogs || dailyLogs.length === 0) return null;

  const currentLog = dailyLogs[activeDayIdx] || dailyLogs[0];
  const totalDays = dailyLogs.length;

  return (
    <div>
      {/* Day Selector & Navigation */}
      <div className="eld-nav">
        <button
          className="eld-nav__btn"
          onClick={() => setActiveDayIdx((prev) => Math.max(0, prev - 1))}
          disabled={activeDayIdx === 0}
        >
          ◀ Previous Day
        </button>
        <span className="eld-nav__page">
          Daily Log {activeDayIdx + 1} of {totalDays} — {currentLog.date}
        </span>
        <button
          className="eld-nav__btn"
          onClick={() => setActiveDayIdx((prev) => Math.min(totalDays - 1, prev + 1))}
          disabled={activeDayIdx >= totalDays - 1}
        >
          Next Day ▶
        </button>
      </div>

      {/* Main Active Day Canvas Sheet */}
      <SingleLogSheet log={currentLog} />

      {/* Full Sheet Carousel / Multi-day list if multiple days */}
      {totalDays > 1 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
            📄 All Daily Log Sheets for this Trip ({totalDays} Days):
          </div>
          {dailyLogs.map((log, index) => (
            <div key={`all-logs-${index}`} style={{ marginBottom: 20 }}>
              <SingleLogSheet log={log} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleLogSheet({ log }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && log) {
      drawELDLog(canvasRef.current, log.entries);
    }
  }, [log]);

  const totalCalculatedHours =
    (log.total_off_duty_hours || 0) +
    (log.total_sleeper_hours || 0) +
    (log.total_driving_hours || 0) +
    (log.total_on_duty_hours || 0);

  return (
    <div className="eld-sheet">
      {/* Form Header */}
      <div className="eld-sheet__header">
        <div>
          <div className="eld-sheet__title">
            DRIVER'S DAILY LOG — 24 HOUR PERIOD
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>
            Property-Carrying Driver • 70 Hours / 8 Days Compliance (FMCSA § 395.8)
          </div>
        </div>
        <div className="eld-sheet__date">
          📅 Date: {log.date} (Day #{log.day_number})
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="eld-sheet__info-row">
        <div className="eld-sheet__info-item">
          <strong>Carrier:</strong> SpotterAI Logistics LLC
        </div>
        <div className="eld-sheet__info-item">
          <strong>Truck ID:</strong> Unit #SPOT-882
        </div>
        <div className="eld-sheet__info-item">
          <strong>Miles Today:</strong> {log.total_miles_driving?.toFixed(1) || 0} mi
        </div>
        <div className="eld-sheet__info-item">
          <strong>Home Terminal:</strong> SpotterAI HQ
        </div>
      </div>

      {/* Canvas Log Grid */}
      <div className="eld-canvas-container">
        <canvas ref={canvasRef} className="eld-canvas" />
      </div>

      {/* Hours Summary Breakdown */}
      <div className="eld-sheet__totals">
        <div className="eld-total">
          <div className="eld-total__dot eld-total__dot--off-duty"></div>
          <span className="eld-total__label">Off Duty:</span>
          <span className="eld-total__value">{log.total_off_duty_hours?.toFixed(2)} hr</span>
        </div>
        <div className="eld-total">
          <div className="eld-total__dot eld-total__dot--sleeper"></div>
          <span className="eld-total__label">Sleeper Berth:</span>
          <span className="eld-total__value">{log.total_sleeper_hours?.toFixed(2)} hr</span>
        </div>
        <div className="eld-total">
          <div className="eld-total__dot eld-total__dot--driving"></div>
          <span className="eld-total__label">Driving:</span>
          <span className="eld-total__value">{log.total_driving_hours?.toFixed(2)} hr</span>
        </div>
        <div className="eld-total">
          <div className="eld-total__dot eld-total__dot--on-duty"></div>
          <span className="eld-total__label">On Duty (Not Driving):</span>
          <span className="eld-total__value">{log.total_on_duty_hours?.toFixed(2)} hr</span>
        </div>
        <div className="eld-total" style={{ marginLeft: 'auto', fontWeight: 800 }}>
          <span className="eld-total__label">Day Total:</span>
          <span className="eld-total__value" style={{ color: '#111827' }}>
            {totalCalculatedHours.toFixed(1)} / 24.0 hr
          </span>
        </div>
      </div>

      {/* Duty Status Events & Remarks List */}
      {log.entries && log.entries.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', marginBottom: 6 }}>
            Duty Status Changes & Duty Remarks:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '6px' }}>
            {log.entries.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f9fafb',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #f3f4f6',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: '#4b5563', fontWeight: 600 }}>
                  {formatHourTime(entry.start_hour)} - {formatHourTime(entry.end_hour)}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    background: getStatusBg(entry.status),
                    color: getStatusColor(entry.status),
                  }}
                >
                  {entry.status.replace('_', ' ')}
                </span>
                <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.remarks || entry.location || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatHourTime(h) {
  if (h === undefined || h === null) return '00:00';
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getStatusColor(status) {
  switch (status) {
    case 'off_duty': return '#065f46';
    case 'sleeper_berth': return '#3730a3';
    case 'driving': return '#991b1b';
    case 'on_duty': return '#92400e';
    default: return '#374151';
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'off_duty': return '#d1fae5';
    case 'sleeper_berth': return '#e0e7ff';
    case 'driving': return '#fee2e2';
    case 'on_duty': return '#fef3c7';
    default: return '#f3f4f6';
  }
}
