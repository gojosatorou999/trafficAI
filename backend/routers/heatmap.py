"""
Predictive Accident Heatmap — F7
Endpoints: /api/heatmap/*
Historical heatmap data + Gemini-powered predictive risk zones.
"""
import json
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.models import get_db, Incident
from services.gemini_client import generate_text
from services.mock_data import generate_congestion_zones

router = APIRouter()

# ─── Cache for live predictions (5-min TTL) ───
_prediction_cache = {
    "data": None,
    "timestamp": 0,
}
CACHE_TTL = 300  # 5 minutes


# ─── Pydantic Models ───

class PredictRequest(BaseModel):
    time_of_day: str  # "HH:MM"
    day_of_week: str
    weather: str = "CLEAR"  # CLEAR, RAIN, FOG
    current_congestion_zones: list = []


# ─── Prompts (Section 9.4) ───

PREDICT_SYSTEM = "You are a predictive traffic safety AI. Analyze patterns and predict risk. Return valid JSON only."


def _build_predict_prompt(time_of_day, day_of_week, weather, congestion_zones):
    zones_json = json.dumps(congestion_zones) if congestion_zones else "[]"
    return f"""Predict accident risk zones for Hyderabad in the next 30-60 minutes.
Current conditions:
- Time: {time_of_day} on {day_of_week}
- Weather: {weather}
- Active congestion zones: {zones_json}

Based on typical Hyderabad traffic patterns, identify 8 high-risk locations.
Focus on: Mehdipatnam, HITEC City, Gachibowli ORR, Kukatpally, Ameerpet, Dilsukhnagar.

Return ONLY this JSON:
{{"predictions": [{{"lat": float, "lng": float, "risk_score": int (0-100), "reason": "string", "accident_type": "REAR_END|PEDESTRIAN|INTERSECTION|WRONG_WAY"}}], "summary": "2-sentence overview", "confidence": "HIGH|MEDIUM|LOW"}}"""


def _parse_prediction(response: str) -> dict:
    text = response.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "predictions": [],
            "summary": "Unable to parse prediction. Please retry.",
            "confidence": "LOW",
        }


# ─── Endpoints ───

@router.get("/historical")
async def get_historical(db: Session = Depends(get_db)):
    """Return all historical incidents as heatmap data points."""
    incidents = db.query(Incident).filter(Incident.status == "RESOLVED").all()

    return [
        {
            "lat": i.lat,
            "lng": i.lng,
            "weight": {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(i.severity, 1),
            "type": i.type,
            "severity": i.severity,
        }
        for i in incidents
    ]


@router.post("/predict")
async def predict_risk(request: PredictRequest, db: Session = Depends(get_db)):
    """Gemini predicts accident risk zones for next 30-60 minutes."""
    prompt = _build_predict_prompt(
        request.time_of_day, request.day_of_week,
        request.weather, request.current_congestion_zones
    )
    response = await generate_text(prompt, system=PREDICT_SYSTEM)
    result = _parse_prediction(response)

    # Update cache
    _prediction_cache["data"] = result
    _prediction_cache["timestamp"] = time.time()

    return result


@router.get("/live-prediction")
async def get_live_prediction():
    """Return cached prediction (5-min TTL), or generate fresh one."""
    now = time.time()

    if _prediction_cache["data"] and (now - _prediction_cache["timestamp"]) < CACHE_TTL:
        return {
            **_prediction_cache["data"],
            "cached": True,
            "cache_age_seconds": int(now - _prediction_cache["timestamp"]),
        }

    # Generate fresh prediction with current time
    current = datetime.now(timezone.utc)
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    congestion = generate_congestion_zones()
    congestion_simple = [{"zone_id": z["zone_id"], "level": z["level"]} for z in congestion]

    prompt = _build_predict_prompt(
        current.strftime("%H:%M"),
        day_names[current.weekday()],
        "CLEAR",
        congestion_simple,
    )
    response = await generate_text(prompt, system=PREDICT_SYSTEM)
    result = _parse_prediction(response)

    _prediction_cache["data"] = result
    _prediction_cache["timestamp"] = now

    return {
        **result,
        "cached": False,
        "cache_age_seconds": 0,
    }
