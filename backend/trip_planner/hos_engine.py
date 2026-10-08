"""
Hours of Service (HOS) Engine for property-carrying drivers.

Rules implemented (FMCSA 49 CFR Part 395):
- 11-Hour Driving Limit: May drive max 11 hrs after 10 consecutive hrs off duty.
- 14-Hour Window: May not drive beyond the 14th consecutive hour after coming on duty.
- 30-Minute Break: Required after 8 cumulative hours of driving.
- 70-Hour/8-Day Limit: May not drive after 70 hours on duty in 8 consecutive days.
- 10-Hour Off-Duty: Required between duty periods.

Assumptions:
- Property-carrying driver, 70hrs / 8 days
- No adverse driving conditions
- Fueling at least once every 1,000 miles
- 1 hour for pickup and 1 hour for drop-off
- Average speed derived from route distance / driving time from routing API
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class DutyStatus(str, Enum):
    OFF_DUTY = "off_duty"
    SLEEPER = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY = "on_duty"


@dataclass
class LogEntry:
    """A single entry in the daily log."""
    status: DutyStatus
    start_time: datetime
    end_time: datetime
    remarks: str = ""
    location: str = ""


@dataclass
class DailyLog:
    """One day's worth of log entries."""
    date: str  # YYYY-MM-DD
    day_number: int
    entries: list[LogEntry] = field(default_factory=list)
    total_miles_driving: float = 0.0

    @property
    def total_driving_hours(self) -> float:
        return sum(
            (e.end_time - e.start_time).total_seconds() / 3600
            for e in self.entries
            if e.status == DutyStatus.DRIVING
        )

    @property
    def total_on_duty_hours(self) -> float:
        return sum(
            (e.end_time - e.start_time).total_seconds() / 3600
            for e in self.entries
            if e.status == DutyStatus.ON_DUTY
        )

    @property
    def total_off_duty_hours(self) -> float:
        return sum(
            (e.end_time - e.start_time).total_seconds() / 3600
            for e in self.entries
            if e.status == DutyStatus.OFF_DUTY
        )

    @property
    def total_sleeper_hours(self) -> float:
        return sum(
            (e.end_time - e.start_time).total_seconds() / 3600
            for e in self.entries
            if e.status == DutyStatus.SLEEPER
        )


@dataclass
class Stop:
    """A stop along the route."""
    type: str  # "fuel", "rest", "pickup", "dropoff", "break"
    location: list  # [lng, lat]
    location_name: str
    mile_marker: float
    duration_hours: float
    reason: str
    arrival_time: datetime = None


# ---- HOS Limits ----
MAX_DRIVING_HOURS = 11.0
MAX_DUTY_WINDOW_HOURS = 14.0
BREAK_REQUIRED_AFTER_HOURS = 8.0
BREAK_DURATION_HOURS = 0.5
OFF_DUTY_REQUIRED_HOURS = 10.0
MAX_CYCLE_HOURS = 70.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_DURATION_HOURS = 0.5
PICKUP_DURATION_HOURS = 1.0
DROPOFF_DURATION_HOURS = 1.0
PRE_TRIP_INSPECTION_HOURS = 0.25  # 15 min pre-trip


def plan_trip(
    total_distance_miles: float,
    driving_hours_from_route: float,
    current_cycle_used: float,
    start_time: datetime = None,
) -> dict:
    """
    Plan a trip considering all HOS rules.

    Returns:
        dict with "stops", "daily_logs", "summary"
    """
    if start_time is None:
        start_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        # Start next day if it's already past 8 AM
        if datetime.now().hour >= 8:
            start_time += timedelta(days=1)

    avg_speed = total_distance_miles / driving_hours_from_route if driving_hours_from_route > 0 else 55.0
    # Cap reasonable speed
    avg_speed = min(max(avg_speed, 30.0), 75.0)

    # State tracking
    current_time = start_time
    miles_driven_total = 0.0
    miles_since_fuel = 0.0
    driving_hours_today = 0.0
    hours_since_break = 0.0
    duty_window_start = current_time
    cycle_hours_used = current_cycle_used
    day_number = 1

    stops = []
    daily_logs = []
    current_day_entries = []
    current_day_start = current_time
    current_day_miles = 0.0

    def start_new_day():
        nonlocal day_number, current_day_entries, current_day_start, current_day_miles
        if current_day_entries:
            log = DailyLog(
                date=current_day_start.strftime("%Y-%m-%d"),
                day_number=day_number,
                entries=current_day_entries,
                total_miles_driving=current_day_miles,
            )
            daily_logs.append(log)
        day_number += 1
        current_day_entries = []
        current_day_start = current_time.replace(hour=0, minute=0, second=0)
        current_day_miles = 0.0

    def add_entry(status, duration_hours, remarks="", location=""):
        nonlocal current_time
        if duration_hours <= 0:
            return
        end_time = current_time + timedelta(hours=duration_hours)

        # Handle midnight crossover
        midnight = current_time.replace(hour=0, minute=0, second=0) + timedelta(days=1)
        if end_time > midnight:
            # Split at midnight
            hours_before_midnight = (midnight - current_time).total_seconds() / 3600
            if hours_before_midnight > 0.01:
                current_day_entries.append(LogEntry(
                    status=status,
                    start_time=current_time,
                    end_time=midnight,
                    remarks=remarks,
                    location=location,
                ))
            current_time = midnight
            start_new_day()
            hours_after_midnight = duration_hours - hours_before_midnight
            if hours_after_midnight > 0.01:
                current_day_entries.append(LogEntry(
                    status=status,
                    start_time=midnight,
                    end_time=midnight + timedelta(hours=hours_after_midnight),
                    remarks=remarks,
                    location=location,
                ))
            current_time = midnight + timedelta(hours=hours_after_midnight)
        else:
            current_day_entries.append(LogEntry(
                status=status,
                start_time=current_time,
                end_time=end_time,
                remarks=remarks,
                location=location,
            ))
            current_time = end_time

    def take_rest_break():
        """Take a 10-hour off-duty break, resetting driving limits."""
        nonlocal driving_hours_today, hours_since_break, duty_window_start, cycle_hours_used
        add_entry(
            DutyStatus.SLEEPER,
            OFF_DUTY_REQUIRED_HOURS,
            remarks="10-hr Off Duty / Sleeper Berth",
        )
        driving_hours_today = 0.0
        hours_since_break = 0.0
        duty_window_start = current_time

    def take_30min_break():
        """Take a required 30-minute break."""
        nonlocal hours_since_break
        add_entry(
            DutyStatus.OFF_DUTY,
            BREAK_DURATION_HOURS,
            remarks="30-min Required Break",
        )
        hours_since_break = 0.0

    def get_remaining_driving():
        """How many more hours can we drive before needing a stop?"""
        remaining_11hr = MAX_DRIVING_HOURS - driving_hours_today
        remaining_14hr = MAX_DUTY_WINDOW_HOURS - (current_time - duty_window_start).total_seconds() / 3600
        remaining_break = BREAK_REQUIRED_AFTER_HOURS - hours_since_break
        remaining_cycle = MAX_CYCLE_HOURS - cycle_hours_used
        return max(0, min(remaining_11hr, remaining_14hr, remaining_break, remaining_cycle))

    # === START OF TRIP ===

    # Pre-trip inspection (On Duty, Not Driving)
    add_entry(
        DutyStatus.ON_DUTY,
        PRE_TRIP_INSPECTION_HOURS,
        remarks="Pre-trip Inspection",
    )
    cycle_hours_used += PRE_TRIP_INSPECTION_HOURS

    # Phase 1: Drive to pickup
    pickup_distance = total_distance_miles * 0.0  # Assume current = pickup area or handle via route legs
    # We'll handle actual driving in the main loop

    # For this model, the trip goes: current -> pickup -> dropoff
    # The route_service gives us total distance. We need to figure out
    # where pickup is along the route.

    # We'll model the trip as a series of driving segments with stops inserted.
    remaining_miles = total_distance_miles
    pickup_done = False
    dropoff_done = False

    # Calculate pickup point (first leg distance comes from route legs)
    # For simplicity, we track pickup as happening at the start (current → pickup → dropoff)

    while remaining_miles > 0.1:
        # Check how long we can drive
        driveable_hours = get_remaining_driving()

        if driveable_hours <= 0.01:
            # Need to determine why we stopped
            hours_in_window = (current_time - duty_window_start).total_seconds() / 3600
            if driving_hours_today >= MAX_DRIVING_HOURS - 0.01 or hours_in_window >= MAX_DUTY_WINDOW_HOURS - 0.01:
                # 11-hr or 14-hr limit reached → 10-hr rest
                stops.append(Stop(
                    type="rest",
                    location=[0, 0],  # Will be filled later
                    location_name="Rest Stop",
                    mile_marker=miles_driven_total,
                    duration_hours=OFF_DUTY_REQUIRED_HOURS,
                    reason="11-hr driving / 14-hr window limit reached",
                    arrival_time=current_time,
                ))
                take_rest_break()
                # Post-rest pre-trip
                add_entry(DutyStatus.ON_DUTY, PRE_TRIP_INSPECTION_HOURS, remarks="Pre-trip Inspection")
                cycle_hours_used += PRE_TRIP_INSPECTION_HOURS
            elif hours_since_break >= BREAK_REQUIRED_AFTER_HOURS - 0.01:
                # 30-min break needed
                stops.append(Stop(
                    type="break",
                    location=[0, 0],
                    location_name="Break Stop",
                    mile_marker=miles_driven_total,
                    duration_hours=BREAK_DURATION_HOURS,
                    reason="30-min break required after 8 hrs driving",
                    arrival_time=current_time,
                ))
                take_30min_break()
            elif cycle_hours_used >= MAX_CYCLE_HOURS - 0.01:
                # 70-hr cycle limit — need 34-hr restart
                stops.append(Stop(
                    type="rest",
                    location=[0, 0],
                    location_name="Extended Rest (34-hr Restart)",
                    mile_marker=miles_driven_total,
                    duration_hours=34.0,
                    reason="70-hr/8-day cycle limit reached — 34-hr restart",
                    arrival_time=current_time,
                ))
                add_entry(DutyStatus.SLEEPER, 34.0, remarks="34-hr Restart")
                driving_hours_today = 0.0
                hours_since_break = 0.0
                duty_window_start = current_time
                cycle_hours_used = 0.0
                add_entry(DutyStatus.ON_DUTY, PRE_TRIP_INSPECTION_HOURS, remarks="Pre-trip Inspection")
                cycle_hours_used += PRE_TRIP_INSPECTION_HOURS
            continue

        # Check if we need fuel before we reach driving limit
        miles_driveable = driveable_hours * avg_speed
        miles_to_fuel = FUEL_INTERVAL_MILES - miles_since_fuel

        # Determine how far to drive this segment
        drive_miles = min(remaining_miles, miles_driveable, miles_to_fuel)
        drive_hours = drive_miles / avg_speed

        # Check if pickup should happen (first leg)
        # We'll use the route's first leg distance later; for now, drive

        # DRIVE
        add_entry(
            DutyStatus.DRIVING,
            drive_hours,
            remarks=f"Driving — {drive_miles:.0f} mi",
        )
        miles_driven_total += drive_miles
        remaining_miles -= drive_miles
        miles_since_fuel += drive_miles
        driving_hours_today += drive_hours
        hours_since_break += drive_hours
        cycle_hours_used += drive_hours
        current_day_miles += drive_miles

        # Check if we need to fuel
        if miles_since_fuel >= FUEL_INTERVAL_MILES - 0.1 and remaining_miles > 0.1:
            stops.append(Stop(
                type="fuel",
                location=[0, 0],
                location_name="Fuel Stop",
                mile_marker=miles_driven_total,
                duration_hours=FUEL_STOP_DURATION_HOURS,
                reason="Fueling (every 1,000 miles)",
                arrival_time=current_time,
            ))
            add_entry(DutyStatus.ON_DUTY, FUEL_STOP_DURATION_HOURS, remarks="Fueling Stop")
            cycle_hours_used += FUEL_STOP_DURATION_HOURS
            miles_since_fuel = 0.0

    # === DROP-OFF ===
    stops.append(Stop(
        type="dropoff",
        location=[0, 0],
        location_name="Drop-off Location",
        mile_marker=miles_driven_total,
        duration_hours=DROPOFF_DURATION_HOURS,
        reason="Unloading at destination",
        arrival_time=current_time,
    ))
    add_entry(DutyStatus.ON_DUTY, DROPOFF_DURATION_HOURS, remarks="Drop-off / Unloading")
    cycle_hours_used += DROPOFF_DURATION_HOURS

    # Final off-duty
    end_of_day_hours = 24 - (current_time.hour + current_time.minute / 60)
    if end_of_day_hours > 0:
        add_entry(DutyStatus.OFF_DUTY, end_of_day_hours, remarks="Off Duty")

    # Save last day
    if current_day_entries:
        daily_logs.append(DailyLog(
            date=current_day_start.strftime("%Y-%m-%d"),
            day_number=day_number,
            entries=current_day_entries,
            total_miles_driving=current_day_miles,
        ))

    # Build summary
    total_driving = sum(log.total_driving_hours for log in daily_logs)
    total_on_duty = sum(log.total_on_duty_hours for log in daily_logs)

    summary = {
        "total_days": len(daily_logs),
        "total_miles": round(miles_driven_total, 1),
        "total_driving_hours": round(total_driving, 1),
        "total_on_duty_hours": round(total_on_duty, 1),
        "remaining_cycle_hours": round(MAX_CYCLE_HOURS - cycle_hours_used, 1),
        "fuel_stops": sum(1 for s in stops if s.type == "fuel"),
        "rest_stops": sum(1 for s in stops if s.type == "rest"),
        "break_stops": sum(1 for s in stops if s.type == "break"),
    }

    return {
        "stops": stops,
        "daily_logs": daily_logs,
        "summary": summary,
    }


def plan_trip_with_route(
    route_data: dict,
    pickup_leg_index: int,
    current_cycle_used: float,
    current_location_name: str,
    pickup_location_name: str,
    dropoff_location_name: str,
    start_time: datetime = None,
) -> dict:
    """
    Plan a trip using actual route data to place stops on the map.

    Args:
        route_data: output from route_service.get_route_*
        pickup_leg_index: which leg is current->pickup (0) vs pickup->dropoff (1)
        current_cycle_used: hours already used in 70-hr cycle
        start_time: when the trip starts
    """
    total_distance = route_data["distance_miles"]
    total_driving_hours = route_data["duration_hours"]
    geometry = route_data["geometry"]  # [lng, lat] pairs

    if start_time is None:
        start_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        if datetime.now().hour >= 8:
            start_time += timedelta(days=1)

    avg_speed = total_distance / total_driving_hours if total_driving_hours > 0 else 55.0
    avg_speed = min(max(avg_speed, 30.0), 75.0)

    # Figure out pickup distance (first leg)
    legs = route_data.get("legs", [])
    if len(legs) >= 2:
        pickup_distance = legs[0]["distance_miles"]
    else:
        pickup_distance = 0  # current = pickup

    # ===== State =====
    current_time = start_time
    miles_driven = 0.0
    miles_since_fuel = 0.0
    driving_hours_today = 0.0
    hours_since_break = 0.0
    duty_window_start = current_time
    cycle_hours_used = current_cycle_used
    day_number = 1

    stops = []
    daily_logs = []
    current_day_entries = []
    current_day_start = current_time
    current_day_miles = 0.0

    pickup_done = (pickup_distance == 0)
    dropoff_done = False

    def _start_new_day():
        nonlocal day_number, current_day_entries, current_day_start, current_day_miles
        if current_day_entries:
            daily_logs.append(DailyLog(
                date=current_day_start.strftime("%Y-%m-%d"),
                day_number=day_number,
                entries=current_day_entries,
                total_miles_driving=current_day_miles,
            ))
        day_number += 1
        current_day_entries = []
        current_day_start = current_time.replace(hour=0, minute=0, second=0)
        current_day_miles = 0.0

    def _add_entry(status, duration_hours, remarks="", location=""):
        nonlocal current_time
        if duration_hours <= 0.001:
            return
        end_time = current_time + timedelta(hours=duration_hours)
        midnight = current_time.replace(hour=0, minute=0, second=0) + timedelta(days=1)

        if end_time > midnight:
            hrs_before = (midnight - current_time).total_seconds() / 3600
            if hrs_before > 0.01:
                current_day_entries.append(LogEntry(
                    status=status, start_time=current_time,
                    end_time=midnight, remarks=remarks, location=location,
                ))
            current_time = midnight
            _start_new_day()
            hrs_after = duration_hours - hrs_before
            if hrs_after > 0.01:
                current_day_entries.append(LogEntry(
                    status=status, start_time=midnight,
                    end_time=midnight + timedelta(hours=hrs_after),
                    remarks=remarks, location=location,
                ))
            current_time = midnight + timedelta(hours=hrs_after)
        else:
            current_day_entries.append(LogEntry(
                status=status, start_time=current_time,
                end_time=end_time, remarks=remarks, location=location,
            ))
            current_time = end_time

    def _get_point_at_mile(mile):
        fraction = mile / total_distance if total_distance > 0 else 0
        from . import route_service
        return route_service.interpolate_point_on_route(geometry, min(fraction, 1.0))

    def _remaining_driving():
        remaining_11 = MAX_DRIVING_HOURS - driving_hours_today
        window_elapsed = (current_time - duty_window_start).total_seconds() / 3600
        remaining_14 = MAX_DUTY_WINDOW_HOURS - window_elapsed
        remaining_brk = BREAK_REQUIRED_AFTER_HOURS - hours_since_break
        remaining_cyc = MAX_CYCLE_HOURS - cycle_hours_used
        return max(0, min(remaining_11, remaining_14, remaining_brk, remaining_cyc))

    def _take_10hr_rest(reason=""):
        nonlocal driving_hours_today, hours_since_break, duty_window_start
        _add_entry(DutyStatus.SLEEPER, OFF_DUTY_REQUIRED_HOURS,
                   remarks=f"10-hr Off Duty / Sleeper — {reason}")
        driving_hours_today = 0.0
        hours_since_break = 0.0
        duty_window_start = current_time

    def _take_30min_break():
        nonlocal hours_since_break
        _add_entry(DutyStatus.OFF_DUTY, BREAK_DURATION_HOURS,
                   remarks="30-min Required Break")
        hours_since_break = 0.0

    # ===== PRE-TRIP =====
    _add_entry(DutyStatus.ON_DUTY, PRE_TRIP_INSPECTION_HOURS,
               remarks="Pre-trip Inspection", location=current_location_name)
    cycle_hours_used += PRE_TRIP_INSPECTION_HOURS

    # ===== MAIN DRIVING LOOP =====
    remaining_miles = total_distance

    while remaining_miles > 0.1:
        driveable_hrs = _remaining_driving()

        if driveable_hrs <= 0.01:
            window_elapsed = (current_time - duty_window_start).total_seconds() / 3600
            if driving_hours_today >= MAX_DRIVING_HOURS - 0.01 or window_elapsed >= MAX_DUTY_WINDOW_HOURS - 0.01:
                pt = _get_point_at_mile(miles_driven)
                stops.append(Stop(
                    type="rest", location=pt,
                    location_name="Rest Stop",
                    mile_marker=round(miles_driven, 1),
                    duration_hours=OFF_DUTY_REQUIRED_HOURS,
                    reason="11-hr driving / 14-hr duty window limit",
                    arrival_time=current_time,
                ))
                _take_10hr_rest("11-hr / 14-hr limit")
                _add_entry(DutyStatus.ON_DUTY, PRE_TRIP_INSPECTION_HOURS, remarks="Pre-trip Inspection")
                cycle_hours_used += PRE_TRIP_INSPECTION_HOURS
            elif hours_since_break >= BREAK_REQUIRED_AFTER_HOURS - 0.01:
                pt = _get_point_at_mile(miles_driven)
                stops.append(Stop(
                    type="break", location=pt,
                    location_name="Break Stop",
                    mile_marker=round(miles_driven, 1),
                    duration_hours=BREAK_DURATION_HOURS,
                    reason="30-min break after 8 hrs driving",
                    arrival_time=current_time,
                ))
                _take_30min_break()
            elif cycle_hours_used >= MAX_CYCLE_HOURS - 0.01:
                pt = _get_point_at_mile(miles_driven)
                stops.append(Stop(
                    type="rest", location=pt,
                    location_name="34-hr Restart Location",
                    mile_marker=round(miles_driven, 1),
                    duration_hours=34.0,
                    reason="70-hr/8-day cycle limit — 34-hr restart",
                    arrival_time=current_time,
                ))
                _add_entry(DutyStatus.SLEEPER, 34.0, remarks="34-hr Restart")
                driving_hours_today = 0.0
                hours_since_break = 0.0
                duty_window_start = current_time
                cycle_hours_used = 0.0
                _add_entry(DutyStatus.ON_DUTY, PRE_TRIP_INSPECTION_HOURS, remarks="Pre-trip Inspection")
                cycle_hours_used += PRE_TRIP_INSPECTION_HOURS
            continue

        miles_driveable = driveable_hrs * avg_speed
        miles_to_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
        miles_to_pickup = (pickup_distance - miles_driven) if not pickup_done else float("inf")

        drive_segment = min(remaining_miles, miles_driveable, max(miles_to_fuel, 0.1))
        if not pickup_done and miles_to_pickup <= drive_segment:
            drive_segment = miles_to_pickup

        drive_hours = drive_segment / avg_speed

        # DRIVE
        _add_entry(DutyStatus.DRIVING, drive_hours,
                   remarks=f"Driving — {drive_segment:.0f} mi")
        miles_driven += drive_segment
        remaining_miles -= drive_segment
        miles_since_fuel += drive_segment
        driving_hours_today += drive_hours
        hours_since_break += drive_hours
        cycle_hours_used += drive_hours
        current_day_miles += drive_segment

        # PICKUP
        if not pickup_done and miles_driven >= pickup_distance - 0.1:
            pt = _get_point_at_mile(miles_driven)
            stops.append(Stop(
                type="pickup", location=pt,
                location_name=pickup_location_name,
                mile_marker=round(miles_driven, 1),
                duration_hours=PICKUP_DURATION_HOURS,
                reason="Loading at pickup",
                arrival_time=current_time,
            ))
            _add_entry(DutyStatus.ON_DUTY, PICKUP_DURATION_HOURS,
                       remarks="Pickup — Loading", location=pickup_location_name)
            cycle_hours_used += PICKUP_DURATION_HOURS
            pickup_done = True

        # FUEL
        if miles_since_fuel >= FUEL_INTERVAL_MILES - 0.1 and remaining_miles > 0.1:
            pt = _get_point_at_mile(miles_driven)
            stops.append(Stop(
                type="fuel", location=pt,
                location_name="Fuel Stop",
                mile_marker=round(miles_driven, 1),
                duration_hours=FUEL_STOP_DURATION_HOURS,
                reason="Fueling (every 1,000 mi)",
                arrival_time=current_time,
            ))
            _add_entry(DutyStatus.ON_DUTY, FUEL_STOP_DURATION_HOURS, remarks="Fueling Stop")
            cycle_hours_used += FUEL_STOP_DURATION_HOURS
            miles_since_fuel = 0.0

    # ===== DROP-OFF =====
    pt = _get_point_at_mile(miles_driven)
    stops.append(Stop(
        type="dropoff", location=pt,
        location_name=dropoff_location_name,
        mile_marker=round(miles_driven, 1),
        duration_hours=DROPOFF_DURATION_HOURS,
        reason="Unloading at destination",
        arrival_time=current_time,
    ))
    _add_entry(DutyStatus.ON_DUTY, DROPOFF_DURATION_HOURS,
               remarks="Drop-off / Unloading", location=dropoff_location_name)
    cycle_hours_used += DROPOFF_DURATION_HOURS

    # End of last day — fill remaining time as off-duty
    hours_left = 24 - (current_time.hour + current_time.minute / 60.0)
    if hours_left > 0.01:
        _add_entry(DutyStatus.OFF_DUTY, hours_left, remarks="Off Duty")

    # Save last day
    if current_day_entries:
        daily_logs.append(DailyLog(
            date=current_day_start.strftime("%Y-%m-%d"),
            day_number=day_number,
            entries=current_day_entries,
            total_miles_driving=current_day_miles,
        ))

    # ===== SUMMARY =====
    total_driving = sum(l.total_driving_hours for l in daily_logs)
    total_on_duty = sum(l.total_on_duty_hours for l in daily_logs)

    return {
        "stops": stops,
        "daily_logs": daily_logs,
        "summary": {
            "total_days": len(daily_logs),
            "total_miles": round(miles_driven, 1),
            "total_driving_hours": round(total_driving, 1),
            "total_on_duty_hours": round(total_on_duty, 1),
            "remaining_cycle_hours": round(max(0, MAX_CYCLE_HOURS - cycle_hours_used), 1),
            "fuel_stops": sum(1 for s in stops if s.type == "fuel"),
            "rest_stops": sum(1 for s in stops if s.type == "rest"),
            "break_stops": sum(1 for s in stops if s.type == "break"),
            "start_time": start_time.isoformat(),
            "end_time": current_time.isoformat(),
        },
    }
