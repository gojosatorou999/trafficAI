"""
Public Transport Intelligence — F5
Endpoints: /api/transport/*
Bus arrival prediction, delay detection, live positions.
"""
import json
import random
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, BusRoute
from services.gemini_client import generate_text
from services.mock_data import CHENNAI_BUS_ROUTES
from utils.geo import euclidean_distance

router = APIRouter()


# ─── Pydantic Models ───

class PredictDelayRequest(BaseModel):
    route_id: str
    current_lat: float
    current_lng: float
    scheduled_arrival: Optional[str] = None


# ─── Endpoints ───

@router.get("/routes")
async def get_routes(db: Session = Depends(get_db)):
    """Return all 5 bus routes with current status."""
    routes = db.query(BusRoute).all()
    return [
        {
            "id": r.id,
            "route_id": r.route_id,
            "bus_id": r.bus_id,
            "origin": r.origin,
            "destination": r.destination,
            "current_lat": r.current_lat,
            "current_lng": r.current_lng,
            "delay_minutes": r.delay_minutes,
            "status": r.status,
        }
        for r in routes
    ]


@router.get("/arrivals")
async def get_arrivals(
    stop_lat: float = Query(13.0827, description="Stop latitude"),
    stop_lng: float = Query(80.2707, description="Stop longitude"),
    db: Session = Depends(get_db),
):
    """Get arrivals for the nearest routes to a stop location, sorted by ETA."""
    routes = db.query(BusRoute).all()
    arrivals = []

    for r in routes:
        dist = euclidean_distance(stop_lat, stop_lng, r.current_lat, r.current_lng)
        eta = max(1, int(dist * 500))  # Rough ETA in minutes based on distance
        arrivals.append({
            "route_id": r.route_id,
            "bus_number": r.bus_id,
            "origin": r.origin,
            "destination": r.destination,
            "eta_minutes": eta + r.delay_minutes,
            "delay_minutes": r.delay_minutes,
            "status": r.status,
            "distance_km": round(dist * 111, 1),  # Rough degree-to-km
        })

    return sorted(arrivals, key=lambda x: x["eta_minutes"])


@router.post("/predict-delay")
async def predict_delay(request: PredictDelayRequest, db: Session = Depends(get_db)):
    """Gemini predicts bus delay."""
    route = db.query(BusRoute).filter(BusRoute.route_id == request.route_id).first()

    route_info = ""
    if route:
        route_info = f"Route: {route.origin} → {route.destination}, Bus: {route.bus_id}"

    prompt = f"""Predict the bus delay for this route:
- Route: {request.route_id} ({route_info})
- Current bus position: lat {request.current_lat}, lng {request.current_lng} (Chennai, India)
- Scheduled arrival: {request.scheduled_arrival or 'N/A'}
- Current delay: {route.delay_minutes if route else 0} minutes

Analyze traffic patterns and predict:

Return ONLY this JSON:
{{"predicted_delay_minutes": int, "confidence": "HIGH|MEDIUM|LOW", "reason": "string", "recommendation": "string"}}"""

    system = "You are a public transport analyst. Return valid JSON only."
    response = await generate_text(prompt, system=system)

    # Parse response
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        result = {
            "predicted_delay_minutes": route.delay_minutes if route else 5,
            "confidence": "MEDIUM",
            "reason": "Moderate congestion expected based on current traffic patterns.",
            "recommendation": "Consider informing passengers of potential delay."
        }

    # Update route delay in DB
    if route:
        route.delay_minutes = result.get("predicted_delay_minutes", route.delay_minutes)
        route.status = "ON_TIME" if route.delay_minutes <= 2 else "DELAYED"
        db.commit()

    return {
        "route_id": request.route_id,
        **result,
    }


@router.get("/live-positions")
async def get_live_positions(db: Session = Depends(get_db)):
    """Return all bus positions with simulated movement."""
    routes = db.query(BusRoute).all()
    result = []

    for route in routes:
        # Find this route's waypoints
        route_data = next((r for r in CHENNAI_BUS_ROUTES if r["route_id"] == route.route_id), None)

        if route_data and route_data.get("waypoints"):
            # Move bus toward next waypoint
            waypoints = route_data["waypoints"]
            # Find nearest waypoint
            min_dist = float('inf')
            nearest_idx = 0
            for idx, wp in enumerate(waypoints):
                d = euclidean_distance(route.current_lat, route.current_lng, wp[0], wp[1])
                if d < min_dist:
                    min_dist = d
                    nearest_idx = idx

            # Move toward next waypoint
            next_idx = min(nearest_idx + 1, len(waypoints) - 1)
            target = waypoints[next_idx]

            # Interpolate position
            speed = 0.001 + random.uniform(0, 0.002)
            dlat = target[0] - route.current_lat
            dlng = target[1] - route.current_lng
            dist = max(0.0001, (dlat**2 + dlng**2)**0.5)

            route.current_lat = round(route.current_lat + (dlat / dist) * speed, 6)
            route.current_lng = round(route.current_lng + (dlng / dist) * speed, 6)

            # Occasionally adjust delay
            if random.random() < 0.1:
                route.delay_minutes = max(0, route.delay_minutes + random.choice([-1, 0, 0, 1, 2]))
                route.status = "ON_TIME" if route.delay_minutes <= 2 else "DELAYED"
        else:
            # Random movement fallback
            route.current_lat += random.uniform(-0.001, 0.001)
            route.current_lng += random.uniform(-0.001, 0.001)

        result.append({
            "route_id": route.route_id,
            "bus_id": route.bus_id,
            "origin": route.origin,
            "destination": route.destination,
            "current_lat": route.current_lat,
            "current_lng": route.current_lng,
            "delay_minutes": route.delay_minutes,
            "status": route.status,
        })

    db.commit()
    return result
