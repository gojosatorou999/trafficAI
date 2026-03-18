"""
Mock data generators for IntelliMobility AI.
All data centered on Chennai, India (lat: 13.0827, lng: 80.2707).
"""
import random
import json
from datetime import datetime, timezone, timedelta
from faker import Faker

# Chennai center coordinates
CHENNAI_LAT = 13.0827
CHENNAI_LNG = 80.2707
RADIUS = 0.1  # ~11km radius

fake = Faker("en_IN")

INCIDENT_TYPES = ["CRASH", "FATIGUE", "SLOWDOWN", "STATIONARY", "WRONG_ROUTE"]
SEVERITIES = ["LOW", "MEDIUM", "HIGH"]

# Chennai-specific locations for realism
CHENNAI_INTERSECTIONS = [
    {"name": "Anna Salai - Gemini Flyover", "lat": 13.0604, "lng": 80.2496},
    {"name": "Mount Road - Cathedral Road Junction", "lat": 13.0612, "lng": 80.2565},
    {"name": "OMR - Thoraipakkam Signal", "lat": 12.9352, "lng": 80.2332},
    {"name": "ECR - Thiruvanmiyur Junction", "lat": 12.9830, "lng": 80.2594},
    {"name": "Poonamallee High Road - Koyambedu", "lat": 13.0694, "lng": 80.1948},
    {"name": "GST Road - Guindy Signal", "lat": 13.0067, "lng": 80.2206},
    {"name": "Kathipara Junction", "lat": 13.0126, "lng": 80.2001},
    {"name": "Vadapalani Signal Junction", "lat": 13.0500, "lng": 80.2120},
    {"name": "T Nagar - Panagal Park Signal", "lat": 13.0418, "lng": 80.2341},
    {"name": "Egmore - Central Station Road", "lat": 13.0732, "lng": 80.2609},
    {"name": "Mylapore - Luz Corner", "lat": 13.0339, "lng": 80.2675},
    {"name": "Adyar Signal Junction", "lat": 13.0012, "lng": 80.2565},
    {"name": "Nungambakkam High Road", "lat": 13.0600, "lng": 80.2400},
    {"name": "Velachery Main Road Junction", "lat": 12.9815, "lng": 80.2185},
    {"name": "Tambaram - GST Road Signal", "lat": 12.9249, "lng": 80.1278},
]

CHENNAI_HOSPITALS = [
    {"name": "Apollo Hospital, Greams Road", "lat": 13.0612, "lng": 80.2520},
    {"name": "Fortis Malar Hospital", "lat": 13.0045, "lng": 80.2558},
    {"name": "MIOT International", "lat": 13.0156, "lng": 80.2012},
    {"name": "Government General Hospital", "lat": 13.0780, "lng": 80.2740},
    {"name": "Sri Ramachandra Hospital", "lat": 13.0355, "lng": 80.1422},
]

CHENNAI_BUS_ROUTES = [
    {"route_id": "R001", "bus_id": "TN-01-BUS-1234", "origin": "Broadway", "destination": "Tambaram",
     "waypoints": [(13.0878, 80.2785), (13.0694, 80.2565), (13.0418, 80.2341), (13.0067, 80.2206), (12.9249, 80.1278)]},
    {"route_id": "R002", "bus_id": "TN-01-BUS-5678", "origin": "Koyambedu", "destination": "Thiruvanmiyur",
     "waypoints": [(13.0694, 80.1948), (13.0500, 80.2120), (13.0339, 80.2675), (12.9830, 80.2594)]},
    {"route_id": "R003", "bus_id": "TN-01-BUS-9012", "origin": "Central Station", "destination": "OMR Thoraipakkam",
     "waypoints": [(13.0826, 80.2754), (13.0612, 80.2565), (13.0012, 80.2565), (12.9352, 80.2332)]},
    {"route_id": "R004", "bus_id": "TN-01-BUS-3456", "origin": "T Nagar", "destination": "Guindy",
     "waypoints": [(13.0418, 80.2341), (13.0339, 80.2300), (13.0126, 80.2001), (13.0067, 80.2206)]},
    {"route_id": "R005", "bus_id": "TN-01-BUS-7890", "origin": "Adyar", "destination": "Poonamallee",
     "waypoints": [(13.0012, 80.2565), (13.0339, 80.2675), (13.0500, 80.2120), (13.0694, 80.1948)]},
]


def _random_chennai_lat(seed_rng: random.Random = None):
    rng = seed_rng or random
    return round(CHENNAI_LAT + rng.uniform(-RADIUS, RADIUS), 6)


def _random_chennai_lng(seed_rng: random.Random = None):
    rng = seed_rng or random
    return round(CHENNAI_LNG + rng.uniform(-RADIUS, RADIUS), 6)


def generate_vehicles(n: int = 20, seed: int = None) -> list:
    """Generate simulated vehicle positions around Chennai."""
    rng = random.Random(seed) if seed else random.Random()
    vehicles = []
    for i in range(n):
        vehicles.append({
            "vehicle_id": f"VH-{str(i + 1).zfill(3)}",
            "lat": _random_chennai_lat(rng),
            "lng": _random_chennai_lng(rng),
            "speed": round(rng.uniform(20, 100), 1),
            "heading": round(rng.uniform(0, 360), 1),
            "status": rng.choice(["MOVING", "MOVING", "MOVING", "STOPPED"]),
        })
    return vehicles


def generate_incident(type: str = None, seed: int = None) -> dict:
    """Generate a single incident dict."""
    rng = random.Random(seed) if seed else random.Random()
    inc_type = type or rng.choice(INCIDENT_TYPES)
    severity = rng.choice(SEVERITIES)

    descriptions = {
        "CRASH": "Vehicle collision detected. Multiple vehicles involved.",
        "FATIGUE": "Driver fatigue indicators detected: prolonged eye closure and head drooping.",
        "SLOWDOWN": "Sudden traffic slowdown detected. Multiple vehicles decelerating rapidly.",
        "STATIONARY": "Stationary vehicle detected blocking traffic lane.",
        "WRONG_ROUTE": "Vehicle detected traveling in wrong direction on one-way road.",
    }

    return {
        "type": inc_type,
        "severity": severity,
        "lat": _random_chennai_lat(rng),
        "lng": _random_chennai_lng(rng),
        "description": descriptions.get(inc_type, "Incident detected."),
        "status": "ACTIVE",
        "vehicle_id": f"VH-{rng.randint(1, 20):03d}",
        "confidence": rng.choice(["LOW", "MEDIUM", "HIGH"]),
    }


def generate_traffic_signals(n: int = 15, seed: int = None) -> list:
    """Generate traffic signal states using real Chennai intersections."""
    rng = random.Random(seed) if seed else random.Random()
    signals = []
    intersections = CHENNAI_INTERSECTIONS[:n]
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
    """Generate 5 bus routes with realistic Chennai route names."""
    rng = random.Random(seed) if seed else random.Random()
    routes = []
    for route in CHENNAI_BUS_ROUTES:
        # Start bus at a random waypoint along its route
        wp_idx = rng.randint(0, len(route["waypoints"]) - 1)
        wp = route["waypoints"][wp_idx]
        delay = rng.choice([0, 0, 0, 5, 8, 12, -2])
        status = "ON_TIME" if delay <= 0 else ("EARLY" if delay < 0 else "DELAYED")
        routes.append({
            "route_id": route["route_id"],
            "bus_id": route["bus_id"],
            "origin": route["origin"],
            "destination": route["destination"],
            "current_lat": wp[0],
            "current_lng": wp[1],
            "delay_minutes": max(0, delay),
            "status": status,
        })
    return routes


def generate_risk_scores(n: int = 10, seed: int = None) -> list:
    """Generate intersection risk scores."""
    rng = random.Random(seed) if seed else random.Random()
    scores = []
    intersections = CHENNAI_INTERSECTIONS[:n]
    all_factors = [
        "High traffic density",
        "Frequent braking events",
        "Poor visibility",
        "Pedestrian crossing conflicts",
        "Signal timing issues",
        "Construction zone nearby",
        "Waterlogging prone area",
        "Sharp curves or blind spots",
        "School/hospital zone",
        "Heavy commercial vehicle traffic",
    ]
    for i, intersection in enumerate(intersections):
        score = rng.randint(20, 95)
        n_factors = rng.randint(2, 4)
        factors = rng.sample(all_factors, n_factors)
        risk_level = "LOW" if score < 40 else ("MEDIUM" if score < 70 else ("HIGH" if score < 90 else "CRITICAL"))
        scores.append({
            "intersection_id": f"INT_{str(i + 1).zfill(3)}",
            "lat": intersection["lat"],
            "lng": intersection["lng"],
            "score": score,
            "factors": json.dumps(factors),
            "risk_level": risk_level,
            "intersection_name": intersection["name"],
            "recommendation": f"Deploy traffic calming measures at {intersection['name']}.",
        })
    return scores


def generate_historical_accidents(n: int = 200, seed: int = None) -> list:
    """Generate historical accident data for heatmap seeding."""
    rng = random.Random(seed) if seed else random.Random()
    accidents = []
    for _ in range(n):
        # Cluster around known intersections with some randomness
        base = rng.choice(CHENNAI_INTERSECTIONS)
        accidents.append({
            "type": rng.choice(INCIDENT_TYPES[:4]),  # Exclude WRONG_ROUTE for historical
            "severity": rng.choice(SEVERITIES),
            "lat": round(base["lat"] + rng.uniform(-0.005, 0.005), 6),
            "lng": round(base["lng"] + rng.uniform(-0.005, 0.005), 6),
            "description": f"Historical incident near {base['name']}",
            "status": "RESOLVED",
            "vehicle_id": f"VH-{rng.randint(1, 100):03d}",
            "confidence": "HIGH",
            "created_at": datetime.now(timezone.utc) - timedelta(days=rng.randint(1, 365)),
        })
    return accidents


def generate_congestion_zones(seed: int = None) -> list:
    """Generate mock congestion zone data."""
    rng = random.Random(seed) if seed else random.Random()
    zones = [
        {"zone_id": "CZ_001", "name": "Anna Salai", "lat": 13.0604, "lng": 80.2496},
        {"zone_id": "CZ_002", "name": "OMR IT Corridor", "lat": 12.9500, "lng": 80.2400},
        {"zone_id": "CZ_003", "name": "Kathipara Junction", "lat": 13.0126, "lng": 80.2001},
        {"zone_id": "CZ_004", "name": "T Nagar Shopping Area", "lat": 13.0418, "lng": 80.2341},
        {"zone_id": "CZ_005", "name": "Central Station Area", "lat": 13.0826, "lng": 80.2754},
        {"zone_id": "CZ_006", "name": "Velachery-Tambaram Corridor", "lat": 12.9815, "lng": 80.2185},
    ]
    result = []
    for zone in zones:
        level = rng.choice(["LOW", "MEDIUM", "HIGH"])
        avg_speed = {"LOW": rng.randint(30, 45), "MEDIUM": rng.randint(15, 30), "HIGH": rng.randint(5, 15)}
        result.append({
            "zone_id": zone["zone_id"],
            "name": zone["name"],
            "lat": zone["lat"],
            "lng": zone["lng"],
            "radius_m": rng.randint(300, 800),
            "level": level,
            "avg_speed_kmh": avg_speed[level],
            "vehicle_count": rng.randint(20, 200),
        })
    return result


def generate_emergency_resources(seed: int = None) -> dict:
    """Generate mock emergency resources near Chennai."""
    rng = random.Random(seed) if seed else random.Random()

    def _gen_resource(prefix, n, statuses):
        return [{
            "id": f"{prefix}_{str(i + 1).zfill(3)}",
            "lat": _random_chennai_lat(rng),
            "lng": _random_chennai_lng(rng),
            "status": rng.choice(statuses),
            "distance_km": round(rng.uniform(0.5, 15.0), 1),
        } for i in range(n)]

    return {
        "ambulances": _gen_resource("AMB", 5, ["AVAILABLE", "AVAILABLE", "DISPATCHED", "AVAILABLE"]),
        "police": _gen_resource("POL", 5, ["AVAILABLE", "AVAILABLE", "ON_DUTY", "AVAILABLE"]),
        "tow_trucks": _gen_resource("TOW", 3, ["AVAILABLE", "AVAILABLE", "DISPATCHED"]),
    }


def _filter_model_fields(model_class, data: dict) -> dict:
    """Filter dict to only include keys that are columns on the model."""
    valid_columns = {c.key for c in model_class.__table__.columns}
    return {k: v for k, v in data.items() if k in valid_columns}


def seed_database(db_session):
    """Seed the database with initial mock data if tables are empty."""
    from db.models import Incident, Vehicle, TrafficSignal, BusRoute, RiskScore

    # Check if already seeded
    if db_session.query(Vehicle).count() > 0:
        return False

    # Seed vehicles
    for v in generate_vehicles(20, seed=42):
        db_session.add(Vehicle(**_filter_model_fields(Vehicle, v)))

    # Seed traffic signals
    for s in generate_traffic_signals(15, seed=42):
        db_session.add(TrafficSignal(**_filter_model_fields(TrafficSignal, s)))

    # Seed bus routes
    for r in generate_bus_routes(seed=42):
        db_session.add(BusRoute(**_filter_model_fields(BusRoute, r)))

    # Seed risk scores
    for rs in generate_risk_scores(10, seed=42):
        db_session.add(RiskScore(**_filter_model_fields(RiskScore, rs)))

    # Seed historical incidents
    for inc in generate_historical_accidents(200, seed=42):
        db_session.add(Incident(**_filter_model_fields(Incident, inc)))

    db_session.commit()
    return True
