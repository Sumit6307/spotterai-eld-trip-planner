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
        'Failed to compute trip plan. Please ensure the backend server is running and location names are valid.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'map', label: '🗺️ Interactive Route Map' },
    { key: 'logs', label: '📋 FMCSA ELD Log Sheets' },
    { key: 'stops', label: '🛑 Stops & Rest Schedule' },
  ];

  return (
    <div className="app">
      {/* Top Header Banner */}
      <header className="header">
        <div className="header__logo">
          <div className="header__icon">🚛</div>
          <h1 className="header__title">SpotterAI ELD Trip Planner</h1>
        </div>
        <p className="header__subtitle">
          Commercial route optimization, property-carrying 70h/8d HOS compliance rules engine, and FMCSA-standard daily log sheet generator.
        </p>
      </header>

      {/* Main App Layout */}
      <main className="main-content">
        {/* Left Side: Input Form + Stops Widget */}
        <div>
          <div className="glass-card glass-card--accent">
            <TripForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {tripData?.stops && tripData.stops.length > 0 && (
            <div className="glass-card" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)' }}>
              <StopsList stops={tripData.stops} />
            </div>
          )}
        </div>

        {/* Right Side: Map, ELD Log Sheets & Diagnostics */}
        <div>
          {error && (
            <div className="error-message">
              <strong>⚠️ Error:</strong> {error}
            </div>
          )}

          {isLoading && (
            <div className="glass-card">
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <div className="loading-text">
                  Calculating real road geometry and applying FMCSA HOS rules...
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Geocoding waypoints, computing distance matrix, generating daily ELD logs...
                </p>
              </div>
            </div>
          )}

          {tripData && !isLoading && (
            <div>
              {/* Summary KPIs */}
              <TripSummary summary={tripData.summary} />

              {/* View Switcher Tabs */}
              <div className="tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`tab ${activeTab === t.key ? 'tab--active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Views */}
              {activeTab === 'map' && (
                <div>
                  <RouteMap
                    routeData={tripData.route}
                    locations={tripData.locations}
                    stops={tripData.stops}
                  />
                </div>
              )}

              {activeTab === 'logs' && (
                <div>
                  <ELDLogSheet dailyLogs={tripData.daily_logs} />
                </div>
              )}

              {activeTab === 'stops' && (
                <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
                  <StopsList stops={tripData.stops} />
                </div>
              )}
            </div>
          )}

          {!tripData && !isLoading && !error && (
            <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>🛣️</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Ready to Plan Trip</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto' }}>
                Enter your start, pickup, and drop-off locations with your current cycle hours used. The system will compute the optimal driving route, calculate fueling stops, mandatory rest breaks, and generate complete FMCSA daily log sheets.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
