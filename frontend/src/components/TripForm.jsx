import { useState, useEffect, useRef } from 'react';
import { geocodeSearch } from '../utils/api';

const PRESETS = [
  {
    title: 'Cross-Country Long Haul',
    route: 'LA ➔ Dallas ➔ Chicago',
    current: 'Los Angeles, CA',
    pickup: 'Dallas, TX',
    dropoff: 'Chicago, IL',
    cycle: 20,
    tag: 'Multi-Day & Fuel',
  },
  {
    title: 'Midwest Corridor',
    route: 'Denver ➔ KC ➔ New York',
    current: 'Denver, CO',
    pickup: 'Kansas City, MO',
    dropoff: 'New York, NY',
    cycle: 15,
    tag: 'Standard 3-Day',
  },
  {
    title: 'High Cycle Limit Test',
    route: 'Atlanta ➔ Nashville ➔ Detroit',
    current: 'Atlanta, GA',
    pickup: 'Nashville, TN',
    dropoff: 'Detroit, MI',
    cycle: 58,
    tag: '34h Restart',
  },
  {
    title: 'Short Regional Route',
    route: 'Philadelphia ➔ Baltimore ➔ Boston',
    current: 'Philadelphia, PA',
    pickup: 'Baltimore, MD',
    dropoff: 'Boston, MA',
    cycle: 8,
    tag: 'Single Day',
  },
];

export default function TripForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    currentLocation: 'Denver, CO',
    pickupLocation: 'Kansas City, MO',
    dropoffLocation: 'New York, NY',
    currentCycleUsed: 15,
  });

  const [suggestions, setSuggestions] = useState({});
  const [activeField, setActiveField] = useState(null);
  const debounceRef = useRef({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (['currentLocation', 'pickupLocation', 'dropoffLocation'].includes(field)) {
      clearTimeout(debounceRef.current[field]);
      if (value && value.length >= 3) {
        debounceRef.current[field] = setTimeout(async () => {
          try {
            const results = await geocodeSearch(value);
            setSuggestions((prev) => ({ ...prev, [field]: results }));
            setActiveField(field);
          } catch (err) {
            console.error('Geocode search error:', err);
          }
        }, 300);
      } else {
        setSuggestions((prev) => ({ ...prev, [field]: [] }));
      }
    }
  };

  const selectSuggestion = (field, item) => {
    setFormData((prev) => ({ ...prev, [field]: item.display_name }));
    setSuggestions((prev) => ({ ...prev, [field]: [] }));
    setActiveField(null);
  };

  const applyPreset = (preset) => {
    setFormData({
      currentLocation: preset.current,
      pickupLocation: preset.pickup,
      dropoffLocation: preset.dropoff,
      currentCycleUsed: preset.cycle,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.currentLocation || !formData.pickupLocation || !formData.dropoffLocation) {
      return;
    }
    onSubmit(formData);
  };

  useEffect(() => {
    const close = () => setActiveField(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fields = [
    { key: 'currentLocation', label: '1. Current Location (Start)', icon: '📍', placeholder: 'e.g. Denver, CO' },
    { key: 'pickupLocation', label: '2. Pickup Location (1h Load)', icon: '📦', placeholder: 'e.g. Kansas City, MO' },
    { key: 'dropoffLocation', label: '3. Drop-off Destination (1h Unload)', icon: '🏁', placeholder: 'e.g. New York, NY' },
  ];

  const cyclePercent = Math.min(100, (formData.currentCycleUsed / 70) * 100);
  const cycleColor = formData.currentCycleUsed > 55 ? '#ef4444' : formData.currentCycleUsed > 40 ? '#f59e0b' : '#06b6d4';

  return (
    <div className="glass-panel glass-panel--accent" onClick={(e) => e.stopPropagation()}>
      <div className="form-header">
        <h2 className="form-header-title">
          <span>⚡</span> Plan HOS-Compliant Route
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-body">
          {fields.map((f) => (
            <div className="input-block" key={f.key}>
              <label className="input-label" htmlFor={f.key}>
                {f.label}
              </label>
              <div className="input-wrapper">
                <span className="input-icon">{f.icon}</span>
                <input
                  id={f.key}
                  type="text"
                  className="custom-input"
                  placeholder={f.placeholder}
                  value={formData[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  onFocus={() => {
                    if (suggestions[f.key]?.length) setActiveField(f.key);
                  }}
                  required
                  autoComplete="off"
                />
              </div>
              {activeField === f.key && suggestions[f.key]?.length > 0 && (
                <div className="autocomplete-menu">
                  {suggestions[f.key].map((item, i) => (
                    <div
                      key={i}
                      className="autocomplete-row"
                      onClick={() => selectSuggestion(f.key, item)}
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Interactive 70hr Cycle Hours Slider */}
          <div className="input-block">
            <div className="input-label">
              <span>⏱️ Current Cycle Used (70h/8d Rule)</span>
              <span style={{ color: cycleColor, fontFamily: 'var(--font-mono)' }}>
                {70 - formData.currentCycleUsed}h Remaining
              </span>
            </div>
            <div className="cycle-card">
              <div className="cycle-meta">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accumulated Duty Hours:</span>
                <span className="cycle-val" style={{ color: cycleColor }}>
                  {formData.currentCycleUsed.toFixed(1)} / 70.0 hrs
                </span>
              </div>
              <input
                type="range"
                className="slider-track"
                min="0"
                max="70"
                step="0.5"
                value={formData.currentCycleUsed}
                onChange={(e) => handleChange('currentCycleUsed', parseFloat(e.target.value) || 0)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                <span>0 hrs (Fresh 34h Reset)</span>
                <span>35 hrs</span>
                <span>70 hrs (Limit Max)</span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                <span>Calculating Route & FMCSA Logs...</span>
              </>
            ) : (
              <>
                <span>🚛</span>
                <span>Generate Route & ELD Logs</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Demo Route Scenarios */}
      <div className="presets-section">
        <div className="presets-label">⚡ Quick Demo Test Scenarios:</div>
        <div className="presets-grid">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-button"
              onClick={() => applyPreset(p)}
            >
              <div>
                <div style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>{p.route}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{p.title}</div>
              </div>
              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe', fontWeight: 700 }}>
                {p.tag}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
