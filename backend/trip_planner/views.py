"""
Views for the trip planner API.
"""

import time
from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .hos_engine import DutyStatus, plan_trip_with_route
from .route_service import geocode, get_route_ors, reverse_geocode
from .serializers import TripRequestSerializer


@api_view(["POST"])
def plan_trip_view(request):
    """
    Plan a trip given current, pickup, and dropoff locations.
    Returns route geometry, planned stops, and daily ELD logs.
    """
    serializer = TripRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        # 1. Geocode all locations
        current_geo = geocode(data["current_location"])
        time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
        pickup_geo = geocode(data["pickup_location"])
        time.sleep(1.1)
        dropoff_geo = geocode(data["dropoff_location"])
        time.sleep(1.1)

        # 2. Get route: current → pickup → dropoff
        waypoints = [current_geo, pickup_geo, dropoff_geo]
        route_data = get_route_ors(waypoints)

        # 3. Run HOS engine
        trip_result = plan_trip_with_route(
            route_data=route_data,
            pickup_leg_index=0,
            current_cycle_used=data["current_cycle_used"],
            current_location_name=data["current_location"],
            pickup_location_name=data["pickup_location"],
            dropoff_location_name=data["dropoff_location"],
        )

        # 4. Reverse-geocode stop locations (with rate limiting)
        for stop in trip_result["stops"]:
            if stop.location and stop.location != [0, 0]:
                try:
                    lat = stop.location[1]  # geometry is [lng, lat]
                    lng = stop.location[0]
                    name = reverse_geocode(lat, lng)
                    # Take just city/state from the long name
                    parts = name.split(",")
                    if len(parts) >= 3:
                        stop.location_name = f"{parts[0].strip()}, {parts[-3].strip()}"
                    else:
                        stop.location_name = parts[0].strip()
                    time.sleep(1.1)
                except Exception:
                    pass

        # 5. Build response
        response_data = {
            "route": {
                "total_distance_miles": round(route_data["distance_miles"], 1),
                "total_driving_hours": round(route_data["duration_hours"], 1),
                "geometry": route_data["geometry"],
                "legs": route_data["legs"],
            },
            "locations": {
                "current": current_geo,
                "pickup": pickup_geo,
                "dropoff": dropoff_geo,
            },
            "stops": [
                {
                    "type": s.type,
                    "location": s.location,
                    "location_name": s.location_name,
                    "mile_marker": s.mile_marker,
                    "duration_hours": s.duration_hours,
                    "reason": s.reason,
                    "arrival_time": s.arrival_time.isoformat() if s.arrival_time else None,
                }
                for s in trip_result["stops"]
            ],
            "daily_logs": [
                {
                    "date": log.date,
                    "day_number": log.day_number,
                    "total_miles_driving": round(log.total_miles_driving, 1),
                    "total_driving_hours": round(log.total_driving_hours, 2),
                    "total_on_duty_hours": round(log.total_on_duty_hours, 2),
                    "total_off_duty_hours": round(log.total_off_duty_hours, 2),
                    "total_sleeper_hours": round(log.total_sleeper_hours, 2),
                    "entries": [
                        {
                            "status": entry.status.value,
                            "start_hour": entry.start_time.hour + entry.start_time.minute / 60.0,
                            "end_hour": entry.end_time.hour + entry.end_time.minute / 60.0
                                        if entry.end_time.day == entry.start_time.day
                                        else 24.0,
                            "start_time": entry.start_time.isoformat(),
                            "end_time": entry.end_time.isoformat(),
                            "remarks": entry.remarks,
                            "location": entry.location,
                        }
                        for entry in log.entries
                    ],
                }
                for log in trip_result["daily_logs"]
            ],
            "summary": trip_result["summary"],
        }

        return Response(response_data)

    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return Response(
            {"error": f"An error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def geocode_view(request):
    """Geocode an address for autocomplete."""
    query = request.query_params.get("q", "")
    if not query or len(query) < 3:
        return Response([])

    try:
        import requests as http_requests
        resp = http_requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 5, "countrycodes": "us"},
            headers={"User-Agent": "SpotterAI-ELD-TripPlanner/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()
        return Response([
            {
                "display_name": r["display_name"],
                "lat": float(r["lat"]),
                "lng": float(r["lon"]),
            }
            for r in results
        ])
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def health_check(request):
    """Health check endpoint."""
    return Response({"status": "ok", "service": "SpotterAI ELD Trip Planner"})
