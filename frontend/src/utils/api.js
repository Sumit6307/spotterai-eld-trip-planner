/**
 * API client for the SpotterAI ELD Trip Planner backend.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

/**
 * Plan a trip given locations and cycle hours.
 */
export async function planTrip({ currentLocation, pickupLocation, dropoffLocation, currentCycleUsed }) {
  const response = await api.post('/trip-plan/', {
    current_location: currentLocation,
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocation,
    current_cycle_used: currentCycleUsed,
  });
  return response.data;
}

/**
 * Geocode search for autocomplete.
 */
export async function geocodeSearch(query) {
  const response = await api.get('/geocode/', {
    params: { q: query },
  });
  return response.data;
}

export default api;
