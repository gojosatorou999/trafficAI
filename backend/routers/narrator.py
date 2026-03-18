"""
AI Incident Narrator — F6
Endpoints: /api/narrator/*
Generates real-time natural language situation reports via Gemini.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, NarratorLog, Incident
from services.gemini_client import generate_text
from services.alert_manager import manager
from services.mock_data import generate_incident

router = APIRouter()


# ─── Pydantic Models ───

class NarrateRequest(BaseModel):
    incident_id: Optional[int] = None
    incident_type: str
    lat: float
    lng: float
    severity: str = "MEDIUM"
    details: str = ""


# ─── Prompts (Section 9.3) ───

NARRATOR_SYSTEM = "You are a real-time traffic safety narrator. Write urgent, factual broadcasts for drivers. No emojis. Under 60 words. Return plain text only, no JSON."


def _build_narrator_prompt(incident_type, lat, lng, severity, details):
    return f"""Generate an emergency broadcast for drivers near this incident:
Type: {incident_type}
Location: {lat}, {lng} (Chennai, India)
Severity: {severity}
Details: {details}

Include: what happened, which direction/lane is affected, what drivers nearby should do.
Write in second person ("Drivers on..."). Keep it under 60 words."""


# ─── Endpoints ───

@router.post("/generate")
async def generate_narrative(request: NarrateRequest, db: Session = Depends(get_db)):
    """Generate AI narrative for an incident and broadcast via WebSocket."""
    prompt = _build_narrator_prompt(
        request.incident_type, request.lat, request.lng,
        request.severity, request.details
    )
    narrative = await generate_text(prompt, system=NARRATOR_SYSTEM)

    # Save to DB
    log = NarratorLog(
        incident_id=request.incident_id,
        narrative=narrative,
        incident_type=request.incident_type,
        severity=request.severity,
        broadcast_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Broadcast via WebSocket
    await manager.broadcast({
        "type": "NARRATOR",
        "severity": request.severity,
        "payload": {
            "incident_id": request.incident_id,
            "narrative": narrative,
            "incident_type": request.incident_type,
        },
    })

    return {
        "id": log.id,
        "narrative": narrative,
        "incident_type": request.incident_type,
        "broadcast_at": log.broadcast_at.isoformat(),
    }


@router.get("/logs")
async def get_logs(db: Session = Depends(get_db)):
    """Return last 20 narrator logs ordered by created_at desc."""
    logs = db.query(NarratorLog).order_by(NarratorLog.created_at.desc()).limit(20).all()
    return [
        {
            "id": l.id,
            "incident_id": l.incident_id,
            "narrative": l.narrative,
            "incident_type": l.incident_type,
            "severity": l.severity,
            "broadcast_at": l.broadcast_at.isoformat() if l.broadcast_at else None,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.post("/broadcast-test")
async def broadcast_test(db: Session = Depends(get_db)):
    """Generate a test narrative for a mock incident and broadcast it."""
    mock = generate_incident()

    prompt = _build_narrator_prompt(
        mock["type"], mock["lat"], mock["lng"],
        mock["severity"], mock["description"]
    )
    narrative = await generate_text(prompt, system=NARRATOR_SYSTEM)

    # Save incident to DB
    incident = Incident(
        type=mock["type"],
        severity=mock["severity"],
        lat=mock["lat"],
        lng=mock["lng"],
        description=mock["description"],
        status="ACTIVE",
        vehicle_id=mock.get("vehicle_id"),
        confidence=mock.get("confidence", "HIGH"),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Save narrator log
    log = NarratorLog(
        incident_id=incident.id,
        narrative=narrative,
        incident_type=mock["type"],
        severity=mock["severity"],
        broadcast_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Broadcast
    await manager.broadcast({
        "type": "NARRATOR",
        "severity": mock["severity"],
        "payload": {
            "incident_id": incident.id,
            "narrative": narrative,
            "incident_type": mock["type"],
        },
    })

    return {
        "narrative": narrative,
        "incident": {
            "id": incident.id,
            "type": incident.type,
            "severity": incident.severity,
            "lat": incident.lat,
            "lng": incident.lng,
            "description": incident.description,
        },
        "broadcast": True,
    }
