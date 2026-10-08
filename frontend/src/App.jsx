import { useState } from 'react';
import './index.css';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import ELDLogSheet from './components/ELDLogSheet';
import TripSummary from './components/TripSummary';
import StopsList from './components/StopsList';
import { planTrip } from './utils/api';

export default function App() {
  const [tripData, setTripData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('map');

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await planTrip(formData);
      setTripData(data);
      setActiveTab('map');
    } catch (err) {
      console.error('Trip planning failed:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (typeof err.response?.data === 'string' ? err.response?.data : null) ||
        err.message ||
        'Failed to compute trip plan. Please verify the backend service is running and locations are valid.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'map', label: '🗺️ Interactive Route Map' },
    { key: 'logs', label: '📋 FMCSA ELD Log Sheets' },
    { key: 'stops', label: '🛑 Itinerary & Rest Schedule' },
  ];

  return (
    <div className="app-wrapper">
      {/* Sleek Top Navigation Bar */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="brand-badge">🚛</div>
          <div className="brand-title">
            SpotterAI <span className="tag">Fleet HOS ELD</span>
          </div>
        </div>

        <div className="nav-actions">
          <div className="status-pill">
            <span className="pulse-dot"></span>
            <span>FMCSA 70h/8d Rules Engine Active</span>
          </div>
          <div className="status-pill" style={{ display: 'none' }}>
            <span>v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="main-grid">
        {/* Left Side: Parameters Form + Itinerary Widget */}
        <div>
          <TripForm onSubmit={handleSubmit} isLoading={isLoading} />

          {tripData?.stops && tripData.stops.length > 0 && (
            <div className="glass-panel" style={{ marginTop: 24 }}>
              <StopsList stops={tripData.stops} />
            </div>
          )}
        </div>

        {/* Right Side: Map, ELD Log Sheets & Diagnostics */}
        <div>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 14,
                padding: '16px 20px',
                color: '#fca5a5',
                marginBottom: 20,
                fontSize: '0.9rem',
              }}
            >
              <strong>⚠️ Calculation Notice:</strong> {error}
            </div>
          )}

          {isLoading && (
            <div className="glass-panel loading-view">
              <div className="radar-spinner"></div>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-bright)', marginBottom: 6 }}>
                  Generating HOS Compliance Plan...
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto' }}>
                  Calculating real highway geometry via OpenRouteService, computing mandatory rest & fueling stops, and drawing FMCSA 24-hour log sheets.
                </p>
              </div>
            </div>
          )}

          {tripData && !isLoading && (
            <div>
              {/* Summary KPIs */}
              <TripSummary summary={tripData.summary} />

              {/* View Switcher Tabs */}
              <div className="nav-tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`nav-tab-btn ${activeTab === t.key ? 'nav-tab-btn--active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Active Tab Viewport */}
              {activeTab === 'map' && (
                <RouteMap
                  routeData={tripData.route}
                  locations={tripData.locations}
                  stops={tripData.stops}
                />
              )}

              {activeTab === 'logs' && (
                <ELDLogSheet dailyLogs={tripData.daily_logs} />
              )}

              {activeTab === 'stops' && (
                <div className="glass-panel">
                  <StopsList stops={tripData.stops} />
                </div>
              )}
            </div>
          )}

          {!tripData && !isLoading && !error && (
            <div className="glass-panel" style={{ padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 14 }}>🛣️</div>
              <h3 style={{ color: 'var(--text-bright)', fontSize: '1.25rem', marginBottom: 8 }}>
                Ready to Compute Commercial Route
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
                Select a <strong>Quick Demo Scenario</strong> on the left or enter custom locations with your current cycle hours. The system will automatically plan fueling, mandatory 10-hr rest periods, and generate full FMCSA daily log sheets.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
