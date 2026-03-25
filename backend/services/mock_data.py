"""
Infrastructure seed data for IntelliMobility AI.
All data centered on Hyderabad, India (lat: 17.3850, lng: 78.4867).
This file provides ONLY system infrastructure (intersections, hospitals, routes, signals).
No fake incidents, vehicles, or historical data are generated — those come from real user input.
"""
import json
from datetime import datetime, timezone

# Hyderabad center coordinates
HYDERABAD_LAT = 17.3850
HYDERABAD_LNG = 78.4867
RADIUS = 0.1  # ~11km radius

INCIDENT_TYPES = ["CRASH", "FATIGUE", "SLOWDOWN", "STATIONARY", "WRONG_ROUTE"]
SEVERITIES = ["LOW", "MEDIUM", "HIGH"]

# Hyderabad real intersections
HYDERABAD_INTERSECTIONS = [
    {"name": "Mehdipatnam Circle", "lat": 17.3950, "lng": 78.4420},
    {"name": "Tolichowki Junction", "lat": 17.3980, "lng": 78.4280},
    {"name": "HITEC City Signal", "lat": 17.4435, "lng": 78.3772},
    {"name": "Gachibowli ORR Junction", "lat": 17.4401, "lng": 78.3489},
    {"name": "Kukatpally Y Junction", "lat": 17.4948, "lng": 78.3996},
    {"name": "Ameerpet Metro Junction", "lat": 17.4375, "lng": 78.4483},
    {"name": "Begumpet Flyover", "lat": 17.4440, "lng": 78.4740},
    {"name": "Secunderabad Clock Tower", "lat": 17.4399, "lng": 78.5010},
    {"name": "Dilsukhnagar Bus Stand", "lat": 17.3687, "lng": 78.5279},
    {"name": "LB Nagar Circle", "lat": 17.3487, "lng": 78.5514},
    {"name": "Charminar Junction", "lat": 17.3616, "lng": 78.4747},
    {"name": "Jubilee Hills Checkpost", "lat": 17.4310, "lng": 78.4070},
    {"name": "Madhapur Ayyappa Society", "lat": 17.4430, "lng": 78.3900},
    {"name": "Uppal Ring Road Junction", "lat": 17.4015, "lng": 78.5590},
    {"name": "Habsiguda ECIL Xroads", "lat": 17.4290, "lng": 78.5440},
]

HYDERABAD_HOSPITALS = [
    {"name": "Apollo Hospital, Jubilee Hills", "lat": 17.4260, "lng": 78.4110},
    {"name": "KIMS Hospital, Secunderabad", "lat": 17.4455, "lng": 78.5005},
    {"name": "Yashoda Hospital, Somajiguda", "lat": 17.4280, "lng": 78.4630},
    {"name": "Care Hospital, Banjara Hills", "lat": 17.4160, "lng": 78.4380},
    {"name": "Osmania General Hospital", "lat": 17.3710, "lng": 78.4820},
]

HYDERABAD_BUS_ROUTES = [
    {"route_id": "R001", "bus_id": "TS-08-BUS-1234", "origin": "Secunderabad", "destination": "Mehdipatnam",
     "waypoints": [(17.4399, 78.5010), (17.4375, 78.4483), (17.4310, 78.4070), (17.3950, 78.4420)]},
    {"route_id": "R002", "bus_id": "TS-08-BUS-5678", "origin": "Kukatpally", "destination": "Dilsukhnagar",
     "waypoints": [(17.4948, 78.3996), (17.4375, 78.4483), (17.3850, 78.4867), (17.3687, 78.5279)]},
    {"route_id": "R003", "bus_id": "TS-08-BUS-9012", "origin": "HITEC City", "destination": "LB Nagar",
     "waypoints": [(17.4435, 78.3772), (17.4310, 78.4070), (17.3850, 78.4867), (17.3487, 78.5514)]},
    {"route_id": "R004", "bus_id": "TS-08-BUS-3456", "origin": "Ameerpet", "destination": "Charminar",
     "waypoints": [(17.4375, 78.4483), (17.4160, 78.4380), (17.3850, 78.4867), (17.3616, 78.4747)]},
    {"route_id": "R005", "bus_id": "TS-08-BUS-7890", "origin": "Uppal", "destination": "Gachibowli",
     "waypoints": [(17.4015, 78.5590), (17.4290, 78.5440), (17.4375, 78.4483), (17.4401, 78.3489)]},
]


def generate_traffic_signals(n: int = 15, seed: int = None) -> list:
    """Generate traffic signal states using real Hyderabad intersections."""
    import random
    rng = random.Random(seed) if seed else random.Random()
    signals = []
    intersections = HYDERABAD_INTERSECTIONS[:n]
    for i, intersection in enumerate(intersections):
        signals.append({
            "signal_id": f"SIG_{str(i + 1).zfill(3)}",
            "lat": intersection["lat"],
            "lng": intersection["lng"],
            "state": rng.choice(["GREEN", "RED", "RED", "GREEN"]),
            "green_corridor_active": False,
            "intersection_name": intersection["name"],
        })
    return signals


def generate_bus_routes(seed: int = None) -> list:
    """Generate bus routes with real Hyderabad route data — zero delay by default."""
    routes = []
    for route in HYDERABAD_BUS_ROUTES:
        # Start bus at the origin
        wp = route["waypoints"][0]
        routes.append({
            "route_id": route["route_id"],
            "bus_id": route["bus_id"],
            "origin": route["origin"],
            "destination": route["destination"],
            "current_lat": wp[0],
            "current_lng": wp[1],
            "delay_minutes": 0,
            "status": "ON_TIME",
        })
    return routes


def generate_risk_scores(n: int = 10, seed: int = None) -> list:
    """Generate initial intersection risk scores — all start at 0 (no risk until user reports)."""
    scores = []
    intersections = HYDERABAD_INTERSECTIONS[:n]
    for i, intersection in enumerate(intersections):
        scores.append({
            "intersection_id": f"INT_{str(i + 1).zfill(3)}",
            "lat": intersection["lat"],
            "lng": intersection["lng"],
            "score": 0,
            "factors": json.dumps([]),
            "risk_level": "LOW",
            "intersection_name": intersection["name"],
            "recommendation": "",
        })
    return scores


def generate_congestion_zones(seed: int = None) -> list:
    """Return empty congestion zones — filled by real sensor/user data."""
    return []


def generate_emergency_resources(seed: int = None) -> dict:
    """Return empty resource lists — filled by real dispatch data."""
    return {
        "ambulances": [],
        "police": [],
        "tow_trucks": [],
    }


def generate_incident(type: str = None, seed: int = None) -> dict:
    """Generate a single incident dict for simulation only (triggered by user)."""
    import random
    rng = random.Random(seed) if seed else random.Random()
    inc_type = type or rng.choice(INCIDENT_TYPES)
    severity = rng.choice(SEVERITIES)

    # Pick a random real Hyderabad intersection
    base = rng.choice(HYDERABAD_INTERSECTIONS)

    descriptions = {
        "CRASH": "Vehicle collision detected near " + base["name"] + ".",
        "FATIGUE": "Driver fatigue indicators detected near " + base["name"] + ".",
        "SLOWDOWN": "Traffic slowdown detected near " + base["name"] + ".",
        "STATIONARY": "Stationary vehicle blocking lane near " + base["name"] + ".",
        "WRONG_ROUTE": "Wrong-way vehicle detected near " + base["name"] + ".",
    }

    return {
        "type": inc_type,
        "severity": severity,
        "lat": round(base["lat"] + rng.uniform(-0.005, 0.005), 6),
        "lng": round(base["lng"] + rng.uniform(-0.005, 0.005), 6),
        "description": descriptions.get(inc_type, "Incident detected."),
        "status": "ACTIVE",
        "vehicle_id": f"VH-{rng.randint(1, 100):03d}",
        "confidence": rng.choice(["LOW", "MEDIUM", "HIGH"]),
    }


def _filter_model_fields(model_class, data: dict) -> dict:
    """Filter dict to only include keys that are columns on the model."""
    valid_columns = {c.key for c in model_class.__table__.columns}
    return {k: v for k, v in data.items() if k in valid_columns}


def seed_database(db_session):
    """Seed the database with infrastructure data only (signals, routes, intersections).
    NO fake incidents, NO fake vehicles, NO historical accidents."""
    from db.models import TrafficSignal, BusRoute, RiskScore, Vehicle

    # Check if already seeded
    if db_session.query(TrafficSignal).count() > 0:
        return False

    # Seed traffic signals (real infrastructure)
    for s in generate_traffic_signals(15, seed=42):
        db_session.add(TrafficSignal(**_filter_model_fields(TrafficSignal, s)))

    # Seed bus routes (real infrastructure)
    for r in generate_bus_routes(seed=42):
        db_session.add(BusRoute(**_filter_model_fields(BusRoute, r)))

    # Seed risk scores with 0 (real intersections, no risk yet)
    for rs in generate_risk_scores(10, seed=42):
        db_session.add(RiskScore(**_filter_model_fields(RiskScore, rs)))

    db_session.commit()
    return True
