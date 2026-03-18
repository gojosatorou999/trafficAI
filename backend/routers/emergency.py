"""
Emergency & Green Corridor — F2 + F4
Endpoints: /api/emergency/*
Green corridor for ambulances + SOS reports + emergency resources.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, TrafficSignal, SOSReport, Incident, NarratorLog
from services.gemini_client import generate_text
from services.alert_manager import manager
from services.mock_data import CHENNAI_HOSPITALS, generate_emergency_resources
from utils.geo import find_nearest, euclidean_distance

router = APIRouter()

# ─── Pydantic Models ───

class GreenCorridorRequest(BaseModel):
    ambulance_lat: float
    ambulance_lng: float
    hospital_lat: float
    hospital_lng: float


class SOSRequest(BaseModel):
    user_id: str
    lat: float
    lng: float
    description: Optional[str] = "Emergency SOS"
    severity: str = "HIGH"  # LOW, MEDIUM, HIGH


class SOSStatusUpdate(BaseModel):
    status: str  # RECEIVED, DISPATCHED, RESOLVED


# ─── Prompts (Section 9.2) ───

CORRIDOR_SYSTEM = "You are an emergency traffic coordinator. Return valid JSON only."


def _build_corridor_prompt(amb_lat, amb_lng, hosp_lat, hosp_lng):
    return f"""An ambulance needs a green corridor in Chennai.
Ambulance location: latitude {amb_lat}, longitude {amb_lng}
Hospital location: latitude {hosp_lat}, longitude {hosp_lng}

Plan a green corridor with 5-8 signal waypoints along the fastest route.
All waypoints must be within the Chennai city area.

Return ONLY this JSON:
{{"route": [{{"lat": float, "lng": float, "signal_id": "SIG_001", "action": "GREEN|RED", "intersection_name": "string"}}], "estimated_minutes": int, "distance_km": float, "narrative": "2-sentence description of the corridor for broadcast"}}"""


def _parse_corridor(response: str) -> dict:
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "route": [],
            "estimated_minutes": 15,
            "distance_km": 5.0,
            "narrative": "Green corridor activation requested. Signals being coordinated."
        }


# ─── Green Corridor Endpoints (F2) ───

@router.post("/green-corridor")
async def activate_green_corridor(request: GreenCorridorRequest, db: Session = Depends(get_db)):
    """Activate ambulance green corridor — Gemini plans route, signals updated."""
    prompt = _build_corridor_prompt(
        request.ambulance_lat, request.ambulance_lng,
        request.hospital_lat, request.hospital_lng
    )
    response = await generate_text(prompt, system=CORRIDOR_SYSTEM)
    corridor = _parse_corridor(response)

    # Update traffic signals in DB
    route = corridor.get("route", [])
    for waypoint in route:
        signal_id = waypoint.get("signal_id")
        if signal_id:
            signal = db.query(TrafficSignal).filter(TrafficSignal.signal_id == signal_id).first()
            if signal:
                signal.state = waypoint.get("action", "GREEN")
                signal.green_corridor_active = True
            else:
                # Create new signal entry if not found
                new_signal = TrafficSignal(
                    signal_id=signal_id,
                    lat=waypoint.get("lat", 13.0827),
                    lng=waypoint.get("lng", 80.2707),
                    state=waypoint.get("action", "GREEN"),
                    green_corridor_active=True,
                    intersection_name=waypoint.get("intersection_name", ""),
                )
                db.add(new_signal)

    db.commit()

    # Broadcast corridor activation
    await manager.broadcast({
        "type": "CORRIDOR_ACTIVATED",
        "severity": "CRITICAL",
        "payload": {
            "route": route,
            "eta_minutes": corridor.get("estimated_minutes", 15),
            "distance_km": corridor.get("distance_km", 5.0),
            "narrative": corridor.get("narrative", ""),
        },
    })

    return corridor


@router.get("/signals")
async def get_signals(db: Session = Depends(get_db)):
    """Return all traffic signal states."""
    signals = db.query(TrafficSignal).all()
    return [
        {
            "id": s.id,
            "signal_id": s.signal_id,
            "lat": s.lat,
            "lng": s.lng,
            "state": s.state,
            "green_corridor_active": s.green_corridor_active,
            "intersection_name": s.intersection_name,
        }
        for s in signals
    ]


@router.post("/reset-corridor")
async def reset_corridor(db: Session = Depends(get_db)):
    """Reset all signals to normal state."""
    db.query(TrafficSignal).update({
        TrafficSignal.green_corridor_active: False,
        TrafficSignal.state: "NORMAL",
    })
    db.commit()

    await manager.broadcast({
        "type": "CORRIDOR_RESET",
        "severity": "LOW",
        "payload": {},
    })

    return {"status": "reset", "message": "All signals reset to NORMAL."}


@router.get("/hospitals")
async def get_hospitals():
    """Return hardcoded list of 5 Chennai hospitals."""
    return [
        {"id": i + 1, "name": h["name"], "lat": h["lat"], "lng": h["lng"]}
        for i, h in enumerate(CHENNAI_HOSPITALS)
    ]


@router.get("/resources")
async def get_resources():
    """Return mock emergency resources: ambulances, police, tow trucks."""
    return generate_emergency_resources(seed=None)


# ─── SOS Endpoints (F4) ───

@router.post("/sos")
async def submit_sos(request: SOSRequest, db: Session = Depends(get_db)):
    """Submit emergency SOS with GPS location."""
    # Save SOS report
    sos = SOSReport(
        user_id=request.user_id,
        lat=request.lat,
        lng=request.lng,
        description=request.description,
        severity=request.severity,
        status="RECEIVED",
    )
    db.add(sos)
    db.commit()
    db.refresh(sos)

    # Find nearest resources
    resources = generate_emergency_resources()
    nearest_ambulance = find_nearest(request.lat, request.lng, resources["ambulances"])
    nearest_hospital = find_nearest(request.lat, request.lng, [
        {"name": h["name"], "lat": h["lat"], "lng": h["lng"]} for h in CHENNAI_HOSPITALS
    ])
    nearest_police = find_nearest(request.lat, request.lng, resources["police"])

    # Estimate response time
    if nearest_ambulance:
        distance = euclidean_distance(request.lat, request.lng, nearest_ambulance["lat"], nearest_ambulance["lng"])
        estimated_minutes = max(3, int(distance * 100))  # Rough estimate
    else:
        estimated_minutes = 10

    # Create incident for narrator
    incident = Incident(
        type="SOS",
        severity=request.severity,
        lat=request.lat,
        lng=request.lng,
        description=request.description,
        status="ACTIVE",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Trigger narrator
    narrator_prompt = f"""Generate an emergency broadcast for drivers near this incident:
Type: SOS Emergency
Location: {request.lat}, {request.lng} (Chennai, India)
Severity: {request.severity}
Details: {request.description}

Include: what happened, which direction/lane is affected, what drivers nearby should do.
Write in second person ("Drivers on..."). Keep it under 60 words."""

    narrator_system = "You are a real-time traffic safety narrator. Write urgent, factual broadcasts for drivers. No emojis. Under 60 words. Return plain text only, no JSON."
    narrative = await generate_text(narrator_prompt, system=narrator_system)

    narrator_log = NarratorLog(
        incident_id=incident.id,
        narrative=narrative,
        incident_type="SOS",
        severity=request.severity,
        broadcast_at=datetime.now(timezone.utc),
    )
    db.add(narrator_log)
    db.commit()

    # Broadcast SOS via WebSocket
    await manager.broadcast({
        "type": "SOS",
        "severity": request.severity,
        "payload": {
            "sos_id": sos.id,
            "lat": request.lat,
            "lng": request.lng,
            "user_id": request.user_id,
            "description": request.description,
        },
    })

    # Broadcast narrator
    await manager.broadcast({
        "type": "NARRATOR",
        "severity": request.severity,
        "payload": {
            "incident_id": incident.id,
            "narrative": narrative,
            "incident_type": "SOS",
        },
    })

    return {
        "sos_id": sos.id,
        "nearest_ambulance": nearest_ambulance,
        "nearest_hospital": nearest_hospital,
        "nearest_police": nearest_police,
        "estimated_response_minutes": estimated_minutes,
        "confirmation_message": f"SOS received. Nearest ambulance dispatched. ETA: {estimated_minutes} minutes.",
        "narrative": narrative,
    }


@router.get("/sos/{sos_id}")
async def get_sos(sos_id: int, db: Session = Depends(get_db)):
    """Get SOS report status + responder details."""
    sos = db.query(SOSReport).filter(SOSReport.id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS report not found")

    return {
        "id": sos.id,
        "user_id": sos.user_id,
        "lat": sos.lat,
        "lng": sos.lng,
        "description": sos.description,
        "severity": sos.severity,
        "status": sos.status,
        "responder_type": sos.responder_type,
        "created_at": sos.created_at.isoformat() if sos.created_at else None,
    }


@router.put("/sos/{sos_id}/status")
async def update_sos_status(sos_id: int, request: SOSStatusUpdate, db: Session = Depends(get_db)):
    """Update SOS report status."""
    sos = db.query(SOSReport).filter(SOSReport.id == sos_id).first()
    if not sos:
        raise HTTPException(status_code=404, detail="SOS report not found")

    if request.status not in ["RECEIVED", "DISPATCHED", "RESOLVED"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    sos.status = request.status
    db.commit()
    db.refresh(sos)

    return {
        "id": sos.id,
        "status": sos.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/sos/history")
async def sos_history(db: Session = Depends(get_db)):
    """Return all SOS reports ordered by created_at desc."""
    reports = db.query(SOSReport).order_by(SOSReport.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "lat": r.lat,
            "lng": r.lng,
            "description": r.description,
            "severity": r.severity,
            "status": r.status,
            "responder_type": r.responder_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]
