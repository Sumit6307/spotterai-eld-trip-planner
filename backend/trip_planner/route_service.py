"""
Route service — handles geocoding and route calculation.
Uses OpenRouteService API for routing and Nominatim for geocoding.
"""

import requests
from django.conf import settings


NOMINATIM_URL = "https://nominatim.openstreetmap.org"
ORS_URL = "https://api.openrouteservice.org"
OSRM_URL = "http://router.project-osrm.org"


def geocode(address: str) -> dict:
    """
    Geocode an address to lat/lng using Nominatim.
    Returns: {"lat": float, "lng": float, "display_name": str}
    """
    resp = requests.get(
        f"{NOMINATIM_URL}/search",
        params={"q": address, "format": "json", "limit": 1},
        headers={"User-Agent": "SpotterAI-ELD-TripPlanner/1.0"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise ValueError(f"Could not geocode address: {address}")
    return {
        "lat": float(data[0]["lat"]),
        "lng": float(data[0]["lon"]),
        "display_name": data[0]["display_name"],
    }


def get_route_osrm(coordinates: list[dict]) -> dict:
    """
    Get route from OSRM (no API key needed).
    coordinates: list of {"lat": float, "lng": float}
    Returns: route data with geometry, distance, duration.
    """
    # OSRM expects lng,lat format
    coord_str = ";".join(
        f"{c['lng']},{c['lat']}" for c in coordinates
    )

    resp = requests.get(
        f"{OSRM_URL}/route/v1/driving/{coord_str}",
        params={
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        },
        headers={"User-Agent": "SpotterAI-ELD-TripPlanner/1.0"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != "Ok":
        raise ValueError(f"OSRM routing error: {data.get('message', 'Unknown error')}")

    route = data["routes"][0]
    return {
        "distance_meters": route["distance"],
        "distance_miles": route["distance"] * 0.000621371,
        "duration_seconds": route["duration"],
        "duration_hours": route["duration"] / 3600,
        "geometry": route["geometry"]["coordinates"],  # [lng, lat] pairs
        "legs": [
            {
                "distance_miles": leg["distance"] * 0.000621371,
                "duration_hours": leg["duration"] / 3600,
                "steps": [
                    {
                        "instruction": step.get("maneuver", {}).get("type", ""),
                        "name": step.get("name", ""),
                        "distance_miles": step["distance"] * 0.000621371,
                        "duration_hours": step["duration"] / 3600,
                        "location": step["maneuver"]["location"],  # [lng, lat]
                    }
                    for step in leg["steps"]
                ],
            }
            for leg in route["legs"]
        ],
    }


def get_route_ors(coordinates: list[dict]) -> dict:
    """
    Get route from OpenRouteService (needs API key).
    Falls back to OSRM if no key configured or if ORS fails.
    """
    api_key = getattr(settings, "ORS_API_KEY", "")
    if not api_key:
        return get_route_osrm(coordinates)

    try:
        body = {
            "coordinates": [[c["lng"], c["lat"]] for c in coordinates],
        }

        resp = requests.post(
            f"{ORS_URL}/v2/directions/driving-car/geojson",
            json=body,
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
            },
            timeout=25,
        )
        resp.raise_for_status()
        data = resp.json()

        feature = data["features"][0]
        props = feature["properties"]
        segments = props["segments"]

        total_distance = sum(s["distance"] for s in segments)
        total_duration = sum(s["duration"] for s in segments)

        return {
            "distance_meters": total_distance,
            "distance_miles": total_distance * 0.000621371,
            "duration_seconds": total_duration,
            "duration_hours": total_duration / 3600,
            "geometry": feature["geometry"]["coordinates"],  # [lng, lat]
            "legs": [
                {
                    "distance_miles": seg["distance"] * 0.000621371,
                    "duration_hours": seg["duration"] / 3600,
                    "steps": [
                        {
                            "instruction": step.get("instruction", ""),
                            "name": step.get("name", ""),
                            "distance_miles": step["distance"] * 0.000621371,
                            "duration_hours": step["duration"] / 3600,
                        }
                        for step in seg["steps"]
                    ],
                }
                for seg in segments
            ],
        }
    except Exception as e:
        print(f"OpenRouteService failed ({e}), falling back to OSRM...")
        return get_route_osrm(coordinates)


def interpolate_point_on_route(geometry: list, target_fraction: float) -> list:
    """
    Find a point along the route at a given fraction (0.0 to 1.0).
    geometry: list of [lng, lat] points.
    Returns: [lng, lat]
    """
    if not geometry:
        return [0, 0]
    if target_fraction <= 0:
        return geometry[0]
    if target_fraction >= 1:
        return geometry[-1]

    # Calculate total length of geometry
    total_length = 0
    segment_lengths = []
    for i in range(1, len(geometry)):
        dx = geometry[i][0] - geometry[i - 1][0]
        dy = geometry[i][1] - geometry[i - 1][1]
        length = (dx ** 2 + dy ** 2) ** 0.5
        segment_lengths.append(length)
        total_length += length

    target_length = total_length * target_fraction
    accumulated = 0

    for i, seg_len in enumerate(segment_lengths):
        if accumulated + seg_len >= target_length:
            # Interpolate within this segment
            remaining = target_length - accumulated
            frac = remaining / seg_len if seg_len > 0 else 0
            lng = geometry[i][0] + frac * (geometry[i + 1][0] - geometry[i][0])
            lat = geometry[i][1] + frac * (geometry[i + 1][1] - geometry[i][1])
            return [lng, lat]
        accumulated += seg_len

    return geometry[-1]


def reverse_geocode(lat: float, lng: float) -> str:
    """Reverse-geocode a coordinate to a human-readable name."""
    try:
        resp = requests.get(
            f"{NOMINATIM_URL}/reverse",
            params={"lat": lat, "lon": lng, "format": "json", "zoom": 10},
            headers={"User-Agent": "SpotterAI-ELD-TripPlanner/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("display_name", f"{lat:.4f}, {lng:.4f}")
    except Exception:
        return f"{lat:.4f}, {lng:.4f}"
