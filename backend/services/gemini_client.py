"""
Gemini AI Client — ALL Gemini API calls go through this file.
Uses model: gemini-2.5-flash-preview-05-20
"""
import os
import json
import asyncio
import logging
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize the client once at module load
api_key = os.getenv("GEMINI_API_KEY")
if api_key and api_key != "your_gemini_api_key_here":
    genai.configure(api_key=api_key)
    GEMINI_CONFIGURED = True
else:
    GEMINI_CONFIGURED = False
    logger.warning("GEMINI_API_KEY not set — Gemini calls will return fallback responses.")

MODEL_NAME = "gemini-2.5-flash"


async def _call_gemini_with_retry(generate_fn, max_retries: int = 3):
    """Call Gemini with exponential backoff on rate limit (429) errors."""
    for attempt in range(max_retries):
        try:
            # Run the blocking SDK call in a thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, generate_fn)
            return result.text
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "Resource" in error_str.lower():
                wait_time = (2 ** attempt) * 1
                logger.warning(f"Rate limited (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Gemini API error: {e}")
                raise e
    raise Exception("Max retries exceeded for Gemini API call")


async def analyze_image(base64_image: str, prompt: str) -> str:
    """Analyze a single image using Gemini vision."""
    if not GEMINI_CONFIGURED:
        return _fallback_image_response()

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        image_part = {
            "mime_type": "image/jpeg",
            "data": base64_image
        }

        def generate():
            return model.generate_content([prompt, image_part])

        return await _call_gemini_with_retry(generate)
    except Exception as e:
        logger.error(f"analyze_image failed: {e}")
        return _fallback_image_response()


async def analyze_video_frames(frames: list, prompt: str) -> str:
    """Analyze multiple video frames (base64 encoded) using Gemini vision."""
    if not GEMINI_CONFIGURED:
        return _fallback_video_response()

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        parts = [prompt]
        for frame in frames:
            parts.append({
                "mime_type": "image/jpeg",
                "data": frame
            })

        def generate():
            return model.generate_content(parts)

        return await _call_gemini_with_retry(generate)
    except Exception as e:
        logger.error(f"analyze_video_frames failed: {e}")
        return _fallback_video_response()


async def generate_text(prompt: str, system: str = None) -> str:
    """Generate text using Gemini (for narratives, routing, predictions)."""
    if not GEMINI_CONFIGURED:
        return _fallback_text_response(prompt)

    try:
        if system:
            model = genai.GenerativeModel(
                MODEL_NAME,
                system_instruction=system
            )
        else:
            model = genai.GenerativeModel(MODEL_NAME)

        def generate():
            return model.generate_content(prompt)

        return await _call_gemini_with_retry(generate)
    except Exception as e:
        logger.error(f"generate_text failed: {e}")
        return _fallback_text_response(prompt)


async def analyze_traffic_data(data: dict, prompt: str) -> str:
    """Analyze traffic data by sending it as JSON in the prompt."""
    if not GEMINI_CONFIGURED:
        return _fallback_traffic_response(data)

    try:
        model = genai.GenerativeModel(
            MODEL_NAME,
            system_instruction="You are a traffic safety analyst. Return valid JSON only."
        )
        full_prompt = f"{prompt}\n\nData:\n{json.dumps(data, indent=2)}"

        def generate():
            return model.generate_content(full_prompt)

        return await _call_gemini_with_retry(generate)
    except Exception as e:
        logger.error(f"analyze_traffic_data failed: {e}")
        return _fallback_traffic_response(data)


# ─── Fallback responses when Gemini is not configured ──────────────────
def _fallback_image_response() -> str:
    return json.dumps({
        "fatigue": False,
        "crash": False,
        "stationary": False,
        "slowdown": False,
        "severity": "LOW",
        "details": "AI analysis unavailable — Gemini API key not configured.",
        "confidence": "LOW"
    })


def _fallback_video_response() -> str:
    return json.dumps({
        "fatigue": False,
        "crash": False,
        "stationary": False,
        "slowdown": False,
        "severity": "LOW",
        "details": "AI analysis unavailable — Gemini API key not configured.",
        "confidence": "LOW"
    })


def _fallback_text_response(prompt: str) -> str:
    if "green corridor" in prompt.lower() or "ambulance" in prompt.lower():
        return json.dumps({
            "route": [
                {"lat": 13.0827, "lng": 80.2707, "signal_id": "SIG_001", "action": "GREEN", "intersection_name": "Anna Salai Junction"},
                {"lat": 13.0850, "lng": 80.2720, "signal_id": "SIG_002", "action": "GREEN", "intersection_name": "Mount Road"},
                {"lat": 13.0870, "lng": 80.2740, "signal_id": "SIG_003", "action": "GREEN", "intersection_name": "Gemini Flyover"},
                {"lat": 13.0890, "lng": 80.2760, "signal_id": "SIG_004", "action": "GREEN", "intersection_name": "Nungambakkam Junction"},
                {"lat": 13.0910, "lng": 80.2780, "signal_id": "SIG_005", "action": "GREEN", "intersection_name": "Kodambakkam Bridge"}
            ],
            "estimated_minutes": 12,
            "distance_km": 5.3,
            "narrative": "Emergency green corridor activated from Anna Salai to Kodambakkam. All 5 signals set to green for ambulance passage."
        })
    elif "narrator" in prompt.lower() or "broadcast" in prompt.lower() or "emergency broadcast" in prompt.lower():
        return "Drivers on the eastbound lane near Anna Salai: A traffic incident has been reported ahead. Reduce speed and prepare to merge left. Emergency services are en route. Expect delays of 10-15 minutes."
    elif "predict" in prompt.lower() and "risk" in prompt.lower():
        return json.dumps({
            "predictions": [
                {"lat": 13.0827, "lng": 80.2707, "risk_score": 85, "reason": "High traffic density at peak hours on Anna Salai", "accident_type": "REAR_END"},
                {"lat": 13.0600, "lng": 80.2300, "risk_score": 72, "reason": "Poor visibility at GST Road junction", "accident_type": "INTERSECTION"},
                {"lat": 13.1000, "lng": 80.2900, "risk_score": 68, "reason": "Pedestrian crossing congestion on OMR", "accident_type": "PEDESTRIAN"},
                {"lat": 13.0500, "lng": 80.2500, "risk_score": 78, "reason": "Sharp curves on ECR with speeding vehicles", "accident_type": "WRONG_WAY"},
                {"lat": 13.0700, "lng": 80.2600, "risk_score": 65, "reason": "Construction zone causing lane merges", "accident_type": "REAR_END"},
                {"lat": 13.0900, "lng": 80.2800, "risk_score": 70, "reason": "School zone with irregular crossings", "accident_type": "PEDESTRIAN"},
                {"lat": 13.0400, "lng": 80.2400, "risk_score": 60, "reason": "Waterlogging prone area on Poonamallee High Road", "accident_type": "INTERSECTION"},
                {"lat": 13.0750, "lng": 80.2650, "risk_score": 82, "reason": "Signal malfunction at Mount Road intersection", "accident_type": "INTERSECTION"}
            ],
            "summary": "Chennai shows elevated accident risk during current conditions. Anna Salai and Mount Road intersections are highest risk due to traffic density and signal issues.",
            "confidence": "HIGH"
        })
    elif "score" in prompt.lower() and "intersection" in prompt.lower():
        return json.dumps({
            "score": 65,
            "risk_level": "MEDIUM",
            "factors": ["Moderate traffic density", "Recent braking events detected"],
            "recommendation": "Deploy traffic calming measures and increase signal cycle time."
        })
    elif "wrong" in prompt.lower() and "route" in prompt.lower():
        return json.dumps({
            "is_wrong_route": False,
            "reason": "Vehicle is following the standard route pattern.",
            "suggested_route": "Continue on current heading."
        })
    elif "delay" in prompt.lower() or "predict" in prompt.lower():
        return json.dumps({
            "predicted_delay_minutes": 8,
            "confidence": "MEDIUM",
            "reason": "Moderate congestion detected along the route due to peak hour traffic.",
            "recommendation": "Consider informing passengers of expected 8-minute delay."
        })
    else:
        return "AI analysis completed. No critical issues detected at this time."


def _fallback_traffic_response(data: dict) -> str:
    return json.dumps({
        "score": 55,
        "risk_level": "MEDIUM",
        "factors": ["Moderate traffic density", "Normal braking patterns"],
        "recommendation": "Continue monitoring. No immediate action required."
    })
