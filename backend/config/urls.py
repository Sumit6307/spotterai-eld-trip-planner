"""
URL configuration for SpotterAI ELD Trip Planner.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("trip_planner.urls")),
]
