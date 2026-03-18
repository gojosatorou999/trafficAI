"""
Highway Safety Module — F1
Endpoints: /api/highway/*
Detects driver fatigue, crash events, stationary vehicles, and traffic slowdowns.
"""
import json
import random
import base64
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, Incident, Vehicle
from services.gemini_client import analyze_video_frames
from services.alert_manager import manager
from services.mock_data import generate_incident, generate_vehicles

router = APIRouter()

# ─── Pydantic Models ───

class AnalyzeRequest(BaseModel):
    vehicle_id: str
    frames: list[str]  # base64 encoded frames
    timestamp: Optional[str] = None


class SimulateRequest(BaseModel):
    type: str  # CRASH, FATIGUE, SLOWDOWN, STATIONARY


# ─── Prompts (Section 9.1) ───

SYSTEM_PROMPT = """You are an AI traffic safety analyst. Analyze dashcam footage frames and detect safety hazards. Always return valid JSON only. No markdown, no explanation outside the JSON."""


def _build_analysis_prompt(n_frames: int, vehicle_id: str) -> str:
    return f"""Analyze these {n_frames} dashcam frames from vehicle {vehicle_id}.
Detect the following conditions:
1. Driver fatigue (signs: eye closure > 2s, head drooping, microsleep)
2. Crash event (sudden stop, collision, vehicle deformation)
3. Stationary vehicle blocking lane (vehicle stopped in traffic lane)
4. Sudden traffic slowdown (rapid deceleration of multiple vehicles)

Return ONLY this JSON:
{{"fatigue": bool, "crash": bool, "stationary": bool, "slowdown": bool, "severity": "LOW|MEDIUM|HIGH", "details": "one sentence description", "confidence": "LOW|MEDIUM|HIGH"}}"""


def _parse_analysis(response: str) -> dict:
    """Parse Gemini response JSON, handling potential markdown wrapping."""
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "fatigue": False, "crash": False, "stationary": False, "slowdown": False,
            "severity": "LOW", "details": text[:200], "confidence": "LOW"
        }


def _determine_incident_type(analysis: dict) -> Optional[str]:
    """Determine incident type from analysis flags."""
    if analysis.get("crash"):
        return "CRASH"
    if analysis.get("fatigue"):
        return "FATIGUE"
    if analysis.get("slowdown"):
        return "SLOWDOWN"
    if analysis.get("stationary"):
        return "STATIONARY"
    return None


# ─── Endpoints ───

@router.post("/analyze")
async def analyze_frames(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """Analyze dashcam frames via Gemini for safety hazards."""
    prompt = _build_analysis_prompt(len(request.frames), request.vehicle_id)
    full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"

    response = await analyze_video_frames(request.frames, full_prompt)
    analysis = _parse_analysis(response)

    # Save incident to DB if any flag is true
    inc_type = _determine_incident_type(analysis)
    incident_data = None

    if inc_type:
        # Get vehicle position for lat/lng
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == request.vehicle_id).first()
        lat = vehicle.lat if vehicle else 13.0827
        lng = vehicle.lng if vehicle else 80.2707

        incident = Incident(
            type=inc_type,
            severity=analysis.get("severity", "MEDIUM"),
            lat=lat,
            lng=lng,
            description=analysis.get("details", ""),
            status="ACTIVE",
            vehicle_id=request.vehicle_id,
            confidence=analysis.get("confidence", "MEDIUM"),
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)

        incident_data = {
            "id": incident.id,
            "type": incident.type,
            "severity": incident.severity,
            "lat": incident.lat,
            "lng": incident.lng,
            "vehicle_id": request.vehicle_id,
            "description": incident.description,
        }

        # Broadcast via WebSocket
        await manager.broadcast({
            "type": "INCIDENT",
            "severity": incident.severity,
            "payload": incident_data,
        })

    return {
        "analysis": analysis,
        "incident": incident_data,
        "vehicle_id": request.vehicle_id,
    }


@router.get("/incidents")
async def get_incidents(
    type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Return all highway incidents, ordered by created_at desc."""
    query = db.query(Incident).filter(
        Incident.type.in_(["CRASH", "FATIGUE", "SLOWDOWN", "STATIONARY"])
    )
    if type:
        query = query.filter(Incident.type == type.upper())
    if severity:
        query = query.filter(Incident.severity == severity.upper())

    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()

    return [
        {
            "id": i.id,
            "type": i.type,
            "severity": i.severity,
            "lat": i.lat,
            "lng": i.lng,
            "description": i.description,
            "status": i.status,
            "vehicle_id": i.vehicle_id,
            "confidence": i.confidence,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]


@router.get("/vehicles")
async def get_vehicles(db: Session = Depends(get_db)):
    """Return current vehicle positions with small random movement delta."""
    vehicles = db.query(Vehicle).all()
    result = []
    for v in vehicles:
        # Apply small random delta to simulate movement
        delta_lat = random.uniform(-0.002, 0.002)
        delta_lng = random.uniform(-0.002, 0.002)
        v.lat = round(v.lat + delta_lat, 6)
        v.lng = round(v.lng + delta_lng, 6)
        v.speed = round(random.uniform(20, 100), 1)

        result.append({
            "id": v.id,
            "vehicle_id": v.vehicle_id,
            "lat": v.lat,
            "lng": v.lng,
            "speed": v.speed,
            "heading": v.heading,
            "status": v.status,
        })

    db.commit()
    return result


@router.post("/simulate")
async def simulate_incident(request: SimulateRequest, db: Session = Depends(get_db)):
    """Trigger a simulated incident for demo purposes."""
    inc_type = request.type.upper()
    if inc_type not in ["CRASH", "FATIGUE", "SLOWDOWN", "STATIONARY"]:
        return {"error": f"Invalid type: {inc_type}. Use CRASH, FATIGUE, SLOWDOWN, or STATIONARY."}

    # Generate mock incident data
    mock = generate_incident(type=inc_type)

    # Generate a tiny mock base64 frame (1x1 pixel PNG)
    mock_frame = base64.b64encode(b'\x89PNG\r\n\x1a\n' + b'\x00' * 50).decode()

    # Run Gemini analysis with simulated prompt
    prompt = _build_analysis_prompt(1, mock["vehicle_id"])
    full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
    response = await analyze_video_frames([mock_frame], full_prompt)
    analysis = _parse_analysis(response)

    # Force the correct incident type in analysis for simulation
    analysis[inc_type.lower()] = True
    if not analysis.get("severity") or analysis["severity"] == "LOW":
        analysis["severity"] = mock["severity"]
    if not analysis.get("details"):
        analysis["details"] = mock["description"]

    # Save to DB
    incident = Incident(
        type=inc_type,
        severity=analysis.get("severity", mock["severity"]),
        lat=mock["lat"],
        lng=mock["lng"],
        description=analysis.get("details", mock["description"]),
        status="ACTIVE",
        vehicle_id=mock["vehicle_id"],
        confidence=analysis.get("confidence", "HIGH"),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    incident_data = {
        "id": incident.id,
        "type": incident.type,
        "severity": incident.severity,
        "lat": incident.lat,
        "lng": incident.lng,
        "vehicle_id": incident.vehicle_id,
        "description": incident.description,
        "confidence": incident.confidence,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
    }

    # Broadcast via WebSocket
    await manager.broadcast({
        "type": "INCIDENT",
        "severity": incident.severity,
        "payload": incident_data,
    })

    return {
        "analysis": analysis,
        "incident": incident_data,
    }
