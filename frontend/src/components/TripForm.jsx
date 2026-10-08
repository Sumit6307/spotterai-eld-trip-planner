import { useState, useEffect, useRef } from 'react';
import { geocodeSearch } from '../utils/api';

const PRESETS = [
  {
    name: 'Denver ➔ KC ➔ NYC',
    current: 'Denver, CO',
    pickup: 'Kansas City, MO',
    dropoff: 'New York, NY',
    cycle: 15,
  },
  {
    name: 'LA ➔ Dallas ➔ Chicago',
    current: 'Los Angeles, CA',
    pickup: 'Dallas, TX',
    dropoff: 'Chicago, IL',
    cycle: 24,
  },
  {
    name: 'Seattle ➔ Boise ➔ Denver',
    current: 'Seattle, WA',
    pickup: 'Boise, ID',
    dropoff: 'Denver, CO',
    cycle: 8,
  }
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
        }, 350);
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
    { key: 'currentLocation', label: 'Current Location', icon: '📍', placeholder: 'e.g., Denver, CO' },
    { key: 'pickupLocation', label: 'Pickup Location', icon: '📦', placeholder: 'e.g., Kansas City, MO' },
    { key: 'dropoffLocation', label: 'Dropoff Location', icon: '🏁', placeholder: 'e.g., New York, NY' },
  ];

  return (
    <div className="trip-form" onClick={(e) => e.stopPropagation()}>
      <h2 className="trip-form__title">
        <span>🚛</span> Trip Parameters
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {fields.map((f) => (
            <div className="form-group" key={f.key}>
              <label className="form-label" htmlFor={f.key}>
                {f.label}
              </label>
              <span className="form-input-icon">{f.icon}</span>
              <input
                id={f.key}
                type="text"
                className="form-input form-input--with-icon"
                placeholder={f.placeholder}
                value={formData[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                onFocus={() => {
                  if (suggestions[f.key]?.length) setActiveField(f.key);
                }}
                required
                autoComplete="off"
              />
              {activeField === f.key && suggestions[f.key]?.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions[f.key].map((item, i) => (
                    <div
                      key={i}
                      className="autocomplete-item"
                      onClick={() => selectSuggestion(f.key, item)}
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="form-group">
            <label className="form-label" htmlFor="currentCycleUsed">
              Current Cycle Used (Hours)
            </label>
            <span className="form-input-icon">⏱️</span>
            <input
              id="currentCycleUsed"
              type="number"
              className="form-input form-input--with-icon"
              min="0"
              max="70"
              step="0.5"
              value={formData.currentCycleUsed}
              onChange={(e) => handleChange('currentCycleUsed', parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {isLoading ? '⏳ Computing Route & Logs...' : '⚡ Generate Plan & ELD Logs'}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Demo Presets:
        </div>
        <div className="preset-chips">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
