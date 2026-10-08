import { useRef, useEffect, useState } from 'react';
import { drawELDLog } from '../utils/eldDrawing';

export default function ELDLogSheet({ dailyLogs }) {
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  if (!dailyLogs || dailyLogs.length === 0) return null;

  const currentLog = dailyLogs[activeDayIdx] || dailyLogs[0];
  const totalDays = dailyLogs.length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="eld-container">
      {/* Top Toolbar */}
      <div className="eld-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="eld-nav-button"
            onClick={() => setActiveDayIdx((prev) => Math.max(0, prev - 1))}
            disabled={activeDayIdx === 0}
          >
            ◀ Prev Day
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-bright)' }}>
            Day {activeDayIdx + 1} of {totalDays} ({currentLog.date})
          </span>
          <button
            className="eld-nav-button"
            onClick={() => setActiveDayIdx((prev) => Math.min(totalDays - 1, prev + 1))}
            disabled={activeDayIdx >= totalDays - 1}
          >
            Next Day ▶
          </button>
        </div>

        <button className="eld-nav-button" onClick={handlePrint} style={{ background: 'rgba(99, 102, 241, 0.25)', borderColor: '#6366f1' }}>
          <span>🖨️</span> Print / Save PDF
        </button>
      </div>

      {/* Main Single Day Log Sheet */}
      <SingleLogSheet log={currentLog} />

      {/* Multi-Day Full Overview if more than 1 day */}
      {totalDays > 1 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            📄 Complete Multi-Day Trip Log Sheets ({totalDays} Days):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {dailyLogs.map((log, index) => (
              <SingleLogSheet key={`multi-sheet-${index}`} log={log} />
            ))}
          </div>
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
    <div className="eld-sheet-card">
      {/* Official FMCSA Document Header */}
      <div className="sheet-header-grid">
        <div>
          <div className="sheet-title-main">
            DRIVER'S RECORD OF DUTY STATUS (49 CFR § 395.8)
          </div>
          <div className="sheet-subtitle">
            Property-Carrying Commercial Motor Vehicle Driver • 70-Hour / 8-Day Rule
          </div>
        </div>
        <div className="sheet-date-box">
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Log Date:</div>
          <div className="sheet-date-val">📅 {log.date} (Day #{log.day_number})</div>
        </div>
      </div>

      {/* Carrier & Equipment Metadata Grid */}
      <div className="sheet-meta-strip">
        <div>
          <div className="meta-field-label">Motor Carrier:</div>
          <div className="meta-field-val">SpotterAI Logistics LLC</div>
        </div>
        <div>
          <div className="meta-field-label">US DOT Number:</div>
          <div className="meta-field-val">#3984102-DOT</div>
        </div>
        <div>
          <div className="meta-field-label">Tractor / Unit ID:</div>
          <div className="meta-field-val">Unit #SPOT-882</div>
        </div>
        <div>
          <div className="meta-field-label">Total Miles Driven:</div>
          <div className="meta-field-val" style={{ color: '#0369a1' }}>
            {log.total_miles_driving?.toFixed(1) || 0} mi
          </div>
        </div>
      </div>

      {/* 24-Hour Canvas Drawing Grid */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="canvas-element" />
      </div>

      {/* Hours Summary & Recap Bar */}
      <div className="totals-recap-bar">
        <div className="duty-total-pill">
          <div className="duty-color-square" style={{ background: '#10b981' }}></div>
          <span style={{ color: '#475569' }}>1. Off Duty:</span>
          <span style={{ color: '#0f172a' }}>{log.total_off_duty_hours?.toFixed(2)} hr</span>
        </div>
        <div className="duty-total-pill">
          <div className="duty-color-square" style={{ background: '#8b5cf6' }}></div>
          <span style={{ color: '#475569' }}>2. Sleeper:</span>
          <span style={{ color: '#0f172a' }}>{log.total_sleeper_hours?.toFixed(2)} hr</span>
        </div>
        <div className="duty-total-pill">
          <div className="duty-color-square" style={{ background: '#ef4444' }}></div>
          <span style={{ color: '#475569' }}>3. Driving:</span>
          <span style={{ color: '#0f172a' }}>{log.total_driving_hours?.toFixed(2)} hr</span>
        </div>
        <div className="duty-total-pill">
          <div className="duty-color-square" style={{ background: '#f59e0b' }}></div>
          <span style={{ color: '#475569' }}>4. On Duty:</span>
          <span style={{ color: '#0f172a' }}>{log.total_on_duty_hours?.toFixed(2)} hr</span>
        </div>
        <div className="duty-total-pill" style={{ marginLeft: 'auto', borderLeft: '2px solid #cbd5e1', paddingLeft: 12 }}>
          <span style={{ color: '#0f172a' }}>TOTAL 24-HR:</span>
          <span style={{ color: '#16a34a', fontSize: '0.95rem' }}>
            {totalCalculatedHours.toFixed(1)} / 24.0 hr
          </span>
        </div>
      </div>

      {/* Remarks & Duty Changes Table */}
      {log.entries && log.entries.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Timeline of Duty Status Changes & Remarks:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
            {log.entries.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: '#64748b', fontWeight: 700, minWidth: 80 }}>
                  {formatHourTime(entry.start_hour)} - {formatHourTime(entry.end_hour)}
                </span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    background: getStatusBg(entry.status),
                    color: getStatusColor(entry.status),
                  }}
                >
                  {entry.status.replace('_', ' ')}
                </span>
                <span style={{ color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.remarks || entry.location || 'Normal Operation'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Signature & Certification Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #cbd5e1', fontSize: '0.72rem', color: '#64748b' }}>
        <div>
          I certify that these entries are true and correct as recorded under FMCSA 49 CFR Part 395.
        </div>
        <div style={{ borderBottom: '1px solid #94a3b8', minWidth: 200, textAlign: 'center', paddingBottom: 2, fontFamily: 'cursive', color: '#1e293b', fontSize: '0.9rem' }}>
          Spotter Driver Verified
        </div>
      </div>
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
    case 'off_duty': return '#047857';
    case 'sleeper_berth': return '#6d28d9';
    case 'driving': return '#b91c1c';
    case 'on_duty': return '#b45309';
    default: return '#334155';
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'off_duty': return '#d1fae5';
    case 'sleeper_berth': return '#ede9fe';
    case 'driving': return '#fee2e2';
    case 'on_duty': return '#fef3c7';
    default: return '#f1f5f9';
  }
}
