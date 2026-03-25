"""
Urban Traffic Dashboard — F3
Endpoints: /api/urban/*
Risk scores, congestion zones, accident hotspots, wrong-route detection.
"""
import json
import random
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, RiskScore, Incident
from services.gemini_client import analyze_traffic_data, generate_text
from services.mock_data import generate_congestion_zones, generate_risk_scores, HYDERABAD_INTERSECTIONS
from utils.geo import cluster_points

router = APIRouter()


# ─── Pydantic Models ───

class ScoreIntersectionRequest(BaseModel):
    intersection_id: str
    lat: float
    lng: float
    traffic_density: int  # 0-100
    braking_events: int
    near_collisions: int


class WrongRouteRequest(BaseModel):
    vehicle_id: str
    current_lat: float
    current_lng: float
    heading_degrees: float


# ─── Prompts (Section 9.5) ───

SCORE_SYSTEM = "You are a traffic safety analyst. Return valid JSON only."


def _build_score_prompt(data: dict) -> str:
    return f"""Score this intersection for accident risk based on current data:
- Traffic density: {data['traffic_density']}/100
- Braking events in last hour: {data['braking_events']}
- Near-collision incidents: {data['near_collisions']}
- Location: lat {data['lat']}, lng {data['lng']} (Hyderabad, India)

Return ONLY this JSON:
{{"score": int (0-100), "risk_level": "LOW|MEDIUM|HIGH|CRITICAL", "factors": ["string", "string"], "recommendation": "one sentence action"}}"""


def _parse_json_response(response: str) -> dict:
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {}


# ─── Endpoints ───

@router.get("/risk-scores")
async def get_risk_scores(db: Session = Depends(get_db)):
    """Return all risk scores from real DB data."""
    scores = db.query(RiskScore).all()
    result = []
    for s in scores:
        factors = []
        try:
            factors = json.loads(s.factors) if s.factors else []
        except json.JSONDecodeError:
            factors = []

        intersection_name = getattr(s, 'intersection_name', None) or ""
        if not intersection_name:
            for inter in HYDERABAD_INTERSECTIONS:
                if abs(inter["lat"] - s.lat) < 0.001 and abs(inter["lng"] - s.lng) < 0.001:
                    intersection_name = inter["name"]
                    break

        risk_level = "LOW" if s.score < 40 else ("MEDIUM" if s.score < 70 else ("HIGH" if s.score < 90 else "CRITICAL"))

        result.append({
            "id": s.id,
            "intersection_id": s.intersection_id,
            "lat": s.lat,
            "lng": s.lng,
            "score": s.score,
            "risk_level": risk_level,
            "factors": factors,
            "recommendation": s.recommendation or "",
            "intersection_name": intersection_name,
        })

    return sorted(result, key=lambda x: x["score"], reverse=True)


@router.post("/score-intersection")
async def score_intersection(request: ScoreIntersectionRequest, db: Session = Depends(get_db)):
    """Score a single intersection via Gemini."""
    data = {
        "intersection_id": request.intersection_id,
        "lat": request.lat,
        "lng": request.lng,
        "traffic_density": request.traffic_density,
        "braking_events": request.braking_events,
        "near_collisions": request.near_collisions,
    }

    prompt = _build_score_prompt(data)
    response = await analyze_traffic_data(data, prompt)
    result = _parse_json_response(response)

    # Save to DB
    risk = RiskScore(
        intersection_id=request.intersection_id,
        lat=request.lat,
        lng=request.lng,
        score=result.get("score", 50),
        factors=json.dumps(result.get("factors", [])),
        risk_level=result.get("risk_level", "MEDIUM"),
        recommendation=result.get("recommendation", ""),
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)

    return {
        "id": risk.id,
        "intersection_id": risk.intersection_id,
        "score": risk.score,
        "risk_level": risk.risk_level,
        "factors": result.get("factors", []),
        "recommendation": risk.recommendation,
    }


@router.get("/congestion")
async def get_congestion():
    """Return mock congestion zones."""
    return generate_congestion_zones()


@router.get("/hotspots")
async def get_hotspots(db: Session = Depends(get_db)):
    """Return top 10 historical accident clusters."""
    incidents = db.query(Incident).filter(Incident.status == "RESOLVED").all()

    points = [{"lat": i.lat, "lng": i.lng, "type": i.type, "created_at": i.created_at.isoformat() if i.created_at else None} for i in incidents]
    clusters = cluster_points(points, cluster_radius=0.005)

    # Top 10 by count
    top_clusters = clusters[:10]
    result = []
    for c in top_clusters:
        last_incident = max(
            (p.get("created_at", "") for p in c["points"] if p.get("created_at")),
            default=""
        )
        result.append({
            "lat": c["lat"],
            "lng": c["lng"],
            "accident_count": c["count"],
            "last_incident": last_incident,
        })

    return result


@router.post("/wrong-route")
async def check_wrong_route(request: WrongRouteRequest):
    """Gemini evaluates if vehicle is on wrong/dangerous route."""
    prompt = f"""Evaluate if this vehicle is on a wrong or dangerous route:
- Vehicle ID: {request.vehicle_id}
- Current position: lat {request.current_lat}, lng {request.current_lng} (Hyderabad, India)
- Heading: {request.heading_degrees} degrees

Determine if the vehicle appears to be traveling in the wrong direction or on a dangerous route.

Return ONLY this JSON:
{{"is_wrong_route": bool, "reason": "string", "suggested_route": "string"}}"""

    system = "You are a traffic safety analyst. Return valid JSON only."
    response = await generate_text(prompt, system=system)
    result = _parse_json_response(response)

    if not result:
        result = {
            "is_wrong_route": False,
            "reason": "Vehicle is following the standard route pattern.",
            "suggested_route": "Continue on current heading."
        }

    return result
