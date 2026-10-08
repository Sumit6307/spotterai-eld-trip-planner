"""
Serializers for the trip planner API.
"""

from rest_framework import serializers


class TripRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(
        max_length=500,
        help_text="Current location address or city",
    )
    pickup_location = serializers.CharField(
        max_length=500,
        help_text="Pickup location address or city",
    )
    dropoff_location = serializers.CharField(
        max_length=500,
        help_text="Drop-off location address or city",
    )
    current_cycle_used = serializers.FloatField(
        min_value=0,
        max_value=70,
        help_text="Hours already used in 70-hr/8-day cycle",
    )
