"""
URL configuration for SpotterAI ELD Trip Planner.
"""

from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "status": "online",
        "service": "SpotterAI ELD Trip Planner API",
        "endpoints": {
            "trip_plan": "/api/trip-plan/",
            "geocode": "/api/geocode/",
            "health": "/api/health/"
        }
    })

urlpatterns = [
    path("", root_view, name="root"),
    path("admin/", admin.site.urls),
    path("api/", include("trip_planner.urls")),
]
