"""
IntelliMobility AI — FastAPI Entry Point
"""
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Load .env FIRST
load_dotenv()

from db.models import init_db, SessionLocal
from services.alert_manager import manager
from services.mock_data import seed_database

# Routers
from routers import highway, emergency, urban, transport, narrator, heatmap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB + seed mock data."""
    logger.info("Starting IntelliMobility AI...")
    init_db()
    logger.info("Database initialized.")

    # Seed mock data on first startup
    db = SessionLocal()
    try:
        seeded = seed_database(db)
        if seeded:
            logger.info("Mock data seeded successfully.")
        else:
            logger.info("Database already contains data, skipping seed.")
    finally:
        db.close()

    yield
    logger.info("Shutting down IntelliMobility AI.")


# Create FastAPI app
app = FastAPI(
    title="IntelliMobility AI",
    version="1.0.0",
    description="Intelligent Transportation Safety Platform powered by Gemini 2.5 Flash",
    lifespan=lifespan,
)

# CORS — allow all origins for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(highway.router, prefix="/api/highway", tags=["Highway Safety"])
app.include_router(emergency.router, prefix="/api/emergency", tags=["Emergency & Green Corridor"])
app.include_router(urban.router, prefix="/api/urban", tags=["Urban Traffic"])
app.include_router(transport.router, prefix="/api/transport", tags=["Public Transport"])
app.include_router(narrator.router, prefix="/api/narrator", tags=["AI Narrator"])
app.include_router(heatmap.router, prefix="/api/heatmap", tags=["Predictive Heatmap"])


# Health check
@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# WebSocket endpoint for real-time alerts
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive, receive any client messages
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            logger.debug(f"WS received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        manager.disconnect(websocket)
        logger.warning(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
