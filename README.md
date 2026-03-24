# IntelliMobility AI — Intelligent Transportation Safety Platform

> **Powered by Google Gemini 2.5 Flash** | FastAPI + React + React Native  
> Real-time AI-powered traffic incident detection, emergency response, and predictive analytics for Chennai, India.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Backend API Reference](#backend-api-reference)
5. [Data Models (Database Schema)](#data-models-database-schema)
6. [AI Features Summary](#ai-features-summary)
7. [WebSocket Events](#websocket-events)
8. [Frontend Pages & Components](#frontend-pages--components)
9. [Mobile App Screens](#mobile-app-screens)
10. [Quick Start](#quick-start)
11. [Google Stitch UI Integration Guide](#google-stitch-ui-integration-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ React Web    │  │ React Native │  │ Any REST/WS Client   │   │
│  │ Dashboard    │  │ Mobile App   │  │ (Google Stitch, etc) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │ HTTP/WS         │ HTTP                 │ HTTP/WS      │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (:8000)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    6 API Routers                         │    │
│  │  /api/highway    → Highway Safety (F1)                  │    │
│  │  /api/emergency  → Green Corridor + SOS (F2, F4)        │    │
│  │  /api/urban      → City Risk Dashboard (F3)             │    │
│  │  /api/transport  → Public Transport Intelligence (F5)   │    │
│  │  /api/narrator   → AI Incident Narrator (F6)            │    │
│  │  /api/heatmap    → Predictive Accident Heatmap (F7)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Gemini 2.0   │  │ SQLite DB    │  │ WebSocket Manager    │   │
│  │ Flash Client │  │ (SQLAlchemy) │  │ /ws/alerts           │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Engine** | Google Gemini 2.0 Flash (`google-generativeai`) |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Database** | SQLite via SQLAlchemy ORM |
| **Real-time** | WebSocket (`/ws/alerts`) |
| **Frontend** | React (Vite), React Router, Axios, Leaflet, Recharts |
| **Mobile** | React Native (Expo), react-native-maps |
| **Mock Data** | Faker, Chennai-centered GPS coordinates |

---

## Project Structure

```
TrafAi/
├── backend/
│   ├── .env                          # GEMINI_API_KEY, DB URL, PORT
│   ├── main.py                       # FastAPI app entry point
│   ├── requirements.txt              # Python dependencies
│   ├── db/
│   │   ├── models.py                 # 8 SQLAlchemy ORM models
│   │   └── intellimobility.db        # SQLite database (auto-created)
│   ├── routers/
│   │   ├── highway.py                # F1: Highway Safety
│   │   ├── emergency.py              # F2+F4: Green Corridor + SOS
│   │   ├── urban.py                  # F3: City Risk Dashboard
│   │   ├── transport.py              # F5: Public Transport
│   │   ├── narrator.py               # F6: AI Narrator
│   │   └── heatmap.py                # F7: Predictive Heatmap
│   ├── services/
│   │   ├── gemini_client.py          # 4 Gemini functions + retry + fallbacks
│   │   ├── mock_data.py              # Chennai mock data generators
│   │   └── alert_manager.py          # WebSocket ConnectionManager
│   ├── utils/
│   │   └── geo.py                    # Haversine, proximity, clustering
│   └── demo.py                       # Auto-sequence demo script
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Router with 6 pages
│   │   ├── api/client.js             # Axios instance → localhost:8000
│   │   ├── hooks/useAlerts.js        # WebSocket hook
│   │   ├── components/
│   │   │   ├── Layout.jsx            # Page wrapper
│   │   │   ├── Sidebar.jsx           # Navigation sidebar
│   │   │   ├── AlertBanner.jsx       # Real-time alert banner
│   │   │   ├── BaseMap.jsx           # Leaflet map wrapper
│   │   │   └── SeverityBadge.jsx     # Color-coded severity tag
│   │   └── pages/
│   │       ├── DashboardPage.jsx     # F3+F7: Risk dashboard + heatmap
│   │       ├── HighwayPage.jsx       # F1: Highway incidents
│   │       ├── GreenCorridorPage.jsx # F2: Ambulance corridor
│   │       ├── TransportPage.jsx     # F5: Bus tracking
│   │       ├── NarratorPage.jsx      # F6: AI narratives log
│   │       └── SOSMonitorPage.jsx    # F4: SOS admin view
│   └── vite.config.js
└── mobile/
    ├── App.js                        # Bottom tab navigator (3 tabs)
    ├── src/
    │   ├── api/client.js             # Axios → backend
    │   └── screens/
    │       ├── SOSScreen.js          # Emergency SOS button + GPS
    │       ├── MapScreen.js          # Nearby incidents on map
    │       └── StatusScreen.js       # SOS dispatch status polling
    └── package.json
```

---

## Backend API Reference

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Returns `{"status": "ok", "version": "1.0.0"}` |

### F1: Highway Safety (`/api/highway`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `POST` | `/analyze` | `{vehicle_id, frames: [base64...]}` | Analyze dashcam frames for fatigue, crash, slowdown, stationary | ✅ Vision |
| `GET` | `/incidents` | Query: `?type=CRASH&severity=HIGH&limit=50` | List all highway incidents, newest first | ❌ |
| `GET` | `/vehicles` | — | All 20 vehicle positions (with simulated movement) | ❌ |
| `POST` | `/simulate` | `{type: "CRASH\|FATIGUE\|SLOWDOWN\|STATIONARY"}` | Trigger a demo incident → saves to DB → broadcasts via WS | ✅ Vision |

**Response shape for `/analyze` and `/simulate`:**
```json
{
  "analysis": {
    "fatigue": false,
    "crash": true,
    "stationary": false,
    "slowdown": false,
    "severity": "HIGH",
    "details": "Vehicle collision detected...",
    "confidence": "HIGH"
  },
  "incident": {
    "id": 201,
    "type": "CRASH",
    "severity": "HIGH",
    "lat": 13.0604,
    "lng": 80.2496,
    "vehicle_id": "VH-005",
    "description": "...",
    "confidence": "HIGH",
    "created_at": "2026-03-24T19:00:00.000000"
  }
}
```

### F2: Green Corridor (`/api/emergency`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `POST` | `/green-corridor` | `{ambulance_lat, ambulance_lng, hospital_lat, hospital_lng}` | AI plans 5-8 signal waypoints, updates DB signals to GREEN, broadcasts | ✅ Text |
| `GET` | `/signals` | — | All 15 traffic signal states | ❌ |
| `POST` | `/reset-corridor` | — | Reset all signals to NORMAL | ❌ |
| `GET` | `/hospitals` | — | 5 Chennai hospitals with lat/lng | ❌ |
| `GET` | `/resources` | — | Mock ambulances, police, tow trucks | ❌ |

**Response shape for `/green-corridor`:**
```json
{
  "route": [
    {"lat": 13.0827, "lng": 80.2707, "signal_id": "SIG_001", "action": "GREEN", "intersection_name": "Anna Salai Junction"},
    {"lat": 13.0850, "lng": 80.2720, "signal_id": "SIG_002", "action": "GREEN", "intersection_name": "Mount Road"}
  ],
  "estimated_minutes": 12,
  "distance_km": 5.3,
  "narrative": "Emergency green corridor activated..."
}
```

### F4: SOS System (`/api/emergency`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `POST` | `/sos` | `{user_id, lat, lng, description?, severity}` | Submit SOS → finds nearest responders → creates incident → triggers narrator → broadcasts | ✅ Text |
| `GET` | `/sos/history` | — | All SOS reports, newest first | ❌ |
| `GET` | `/sos/{sos_id}` | — | Single SOS report details | ❌ |
| `PUT` | `/sos/{sos_id}/status` | `{status: "RECEIVED\|DISPATCHED\|RESOLVED"}` | Update SOS status | ❌ |

**Response shape for `/sos`:**
```json
{
  "sos_id": 1,
  "nearest_ambulance": {"id": "AMB_001", "lat": 13.05, "lng": 80.26, "status": "AVAILABLE", "distance_km": 2.1},
  "nearest_hospital": {"name": "Apollo Hospital, Greams Road", "lat": 13.0612, "lng": 80.2520},
  "nearest_police": {"id": "POL_002", "lat": 13.04, "lng": 80.23, "status": "AVAILABLE", "distance_km": 1.5},
  "estimated_response_minutes": 5,
  "confirmation_message": "SOS received. Nearest ambulance dispatched. ETA: 5 minutes.",
  "narrative": "Drivers on the southbound lane near T Nagar: A medical emergency..."
}
```

### F3: Urban Traffic Dashboard (`/api/urban`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `GET` | `/risk-scores` | — | 10 intersection risk scores (with live jitter), sorted by score desc | ❌ |
| `POST` | `/score-intersection` | `{intersection_id, lat, lng, traffic_density, braking_events, near_collisions}` | Gemini scores a single intersection | ✅ Traffic |
| `GET` | `/congestion` | — | 6 mock congestion zones | ❌ |
| `GET` | `/hotspots` | — | Top 10 historical accident clusters (clustered by proximity) | ❌ |
| `POST` | `/wrong-route` | `{vehicle_id, current_lat, current_lng, heading_degrees}` | Gemini evaluates if vehicle is on wrong route | ✅ Text |

**Response shape for `/risk-scores`:**
```json
[
  {
    "id": 5,
    "intersection_id": "INT_005",
    "lat": 13.0694,
    "lng": 80.1948,
    "score": 88,
    "risk_level": "HIGH",
    "factors": ["High traffic density", "Signal timing issues", "Construction zone nearby"],
    "recommendation": "Deploy traffic calming measures at Poonamallee High Road - Koyambedu.",
    "intersection_name": "Poonamallee High Road - Koyambedu"
  }
]
```

### F5: Public Transport (`/api/transport`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `GET` | `/routes` | — | All 5 bus routes with current status | ❌ |
| `GET` | `/arrivals` | Query: `?stop_lat=13.0827&stop_lng=80.2707` | ETAs for nearest buses to a stop | ❌ |
| `POST` | `/predict-delay` | `{route_id, current_lat, current_lng, scheduled_arrival?}` | Gemini predicts bus delay | ✅ Text |
| `GET` | `/live-positions` | — | All bus positions with simulated waypoint movement | ❌ |

**Response shape for `/predict-delay`:**
```json
{
  "route_id": "R001",
  "predicted_delay_minutes": 8,
  "confidence": "MEDIUM",
  "reason": "Moderate congestion detected along the route due to peak hour traffic.",
  "recommendation": "Consider informing passengers of expected 8-minute delay."
}
```

### F6: AI Narrator (`/api/narrator`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `POST` | `/generate` | `{incident_id?, incident_type, lat, lng, severity, details}` | Generate AI narrative for any incident + broadcast | ✅ Text |
| `GET` | `/logs` | — | Last 20 narrator broadcasts | ❌ |
| `POST` | `/broadcast-test` | — | Generate test narrative for random mock incident | ✅ Text |

**Response shape for `/generate`:**
```json
{
  "id": 1,
  "narrative": "Drivers on the eastbound lane near Anna Salai: A traffic incident has been reported ahead. Reduce speed and prepare to merge left. Emergency services are en route.",
  "incident_type": "CRASH",
  "broadcast_at": "2026-03-24T19:00:00.000000"
}
```

### F7: Predictive Heatmap (`/api/heatmap`)
| Method | Endpoint | Request Body | Description | Gemini? |
|--------|----------|-------------|-------------|---------|
| `GET` | `/historical` | — | All 200 resolved incidents as heatmap points (lat, lng, weight, type) | ❌ |
| `POST` | `/predict` | `{time_of_day: "HH:MM", day_of_week, weather: "CLEAR\|RAIN\|FOG", current_congestion_zones: []}` | Gemini predicts 8 risk zones | ✅ Text |
| `GET` | `/live-prediction` | — | Cached prediction (5-min TTL), auto-generates if stale | ✅ Text |

**Response shape for `/predict` and `/live-prediction`:**
```json
{
  "predictions": [
    {"lat": 13.0827, "lng": 80.2707, "risk_score": 85, "reason": "High traffic density at peak hours on Anna Salai", "accident_type": "REAR_END"},
    {"lat": 13.0600, "lng": 80.2300, "risk_score": 72, "reason": "Poor visibility at GST Road junction", "accident_type": "INTERSECTION"}
  ],
  "summary": "Chennai shows elevated accident risk during current conditions. Anna Salai and Mount Road intersections are highest risk.",
  "confidence": "HIGH",
  "cached": false,
  "cache_age_seconds": 0
}
```

---

## Data Models (Database Schema)

### 8 SQLAlchemy Models

| Model | Table | Key Columns | Notes |
|-------|-------|-------------|-------|
| **Incident** | `incidents` | `id, type, severity, lat, lng, description, status, vehicle_id, confidence, created_at` | Types: CRASH, FATIGUE, SLOWDOWN, STATIONARY, WRONG_ROUTE, SOS |
| **Alert** | `alerts` | `id, incident_id (FK), message, sent_to, channel, created_at` | Channels: WEBSOCKET, SMS, EMAIL |
| **Vehicle** | `vehicles` | `id, vehicle_id (unique), lat, lng, speed, heading, status, created_at` | 20 seeded vehicles |
| **TrafficSignal** | `traffic_signals` | `id, signal_id (unique), lat, lng, state, green_corridor_active, intersection_name, created_at` | 15 Chennai intersections |
| **BusRoute** | `bus_routes` | `id, route_id (unique), bus_id, origin, destination, current_lat, current_lng, delay_minutes, status, created_at` | 5 routes |
| **RiskScore** | `risk_scores` | `id, intersection_id, lat, lng, score (0-100), factors (JSON), risk_level, recommendation, intersection_name, created_at` | 10 seeded |
| **SOSReport** | `sos_reports` | `id, user_id, lat, lng, description, severity, status, responder_type, created_at` | Status flow: RECEIVED → DISPATCHED → RESOLVED |
| **NarratorLog** | `narrator_logs` | `id, incident_id (FK), narrative, incident_type, severity, broadcast_at, created_at` | AI-generated text |

### Seed Data (auto-generated on first startup)
- 20 vehicles around Chennai
- 15 traffic signals at real Chennai intersections
- 5 bus routes (Broadway→Tambaram, Koyambedu→Thiruvanmiyur, etc.)
- 10 intersection risk scores
- 200 historical incidents for heatmap

---

## AI Features Summary

| Feature | Gemini Function Used | Input | Output |
|---------|---------------------|-------|--------|
| Dashcam Analysis (F1) | `analyze_video_frames()` | base64 frames + prompt | JSON: fatigue/crash/stationary/slowdown booleans + severity |
| Green Corridor (F2) | `generate_text()` | ambulance + hospital coords | JSON: route waypoints + ETA + narrative |
| Intersection Scoring (F3) | `analyze_traffic_data()` | traffic density + braking events | JSON: score + risk_level + factors + recommendation |
| Wrong Route Detection (F3) | `generate_text()` | vehicle position + heading | JSON: is_wrong_route + reason + suggested_route |
| SOS Narrator (F4) | `generate_text()` | incident type + location + severity | Plain text: 60-word driver broadcast |
| Bus Delay Prediction (F5) | `generate_text()` | route + position + schedule | JSON: predicted_delay + confidence + reason |
| Incident Narrator (F6) | `generate_text()` | incident type + location + details | Plain text: 60-word driver broadcast |
| Heatmap Prediction (F7) | `generate_text()` | time + weather + congestion zones | JSON: 8 risk predictions + summary |

### Gemini Client (`services/gemini_client.py`)
- **4 async functions**: `analyze_image()`, `analyze_video_frames()`, `generate_text()`, `analyze_traffic_data()`
- **Retry logic**: Exponential backoff on 429 (rate limit), max 3 retries
- **Graceful fallbacks**: Every function returns realistic mock JSON/text if API key is missing or Gemini fails
- **Model**: `gemini-2.0-flash`

---

## WebSocket Events

**Endpoint**: `ws://localhost:8000/ws/alerts`

All messages are JSON with this shape:
```json
{
  "type": "EVENT_TYPE",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "payload": { ... },
  "timestamp": "2026-03-24T19:00:00.000000"
}
```

| Event Type | Trigger | Payload |
|-----------|---------|---------|
| `INCIDENT` | Highway incident detected/simulated | `{id, type, severity, lat, lng, vehicle_id, description}` |
| `CORRIDOR_ACTIVATED` | Green corridor created | `{route: [...waypoints], eta_minutes, distance_km, narrative}` |
| `CORRIDOR_RESET` | All signals reset to NORMAL | `{}` |
| `SOS` | SOS report submitted | `{sos_id, lat, lng, user_id, description}` |
| `NARRATOR` | AI narrative generated | `{incident_id, narrative, incident_type}` |

---

## Frontend Pages & Components

### Routes (React Router)

| Path | Page Component | Features Used | Key API Calls |
|------|---------------|---------------|---------------|
| `/` | `DashboardPage.jsx` | F3 + F7 | `GET /api/urban/risk-scores`, `GET /api/heatmap/live-prediction`, `GET /api/urban/hotspots` |
| `/highway` | `HighwayPage.jsx` | F1 | `GET /api/highway/incidents`, `GET /api/highway/vehicles`, `POST /api/highway/simulate` |
| `/corridor` | `GreenCorridorPage.jsx` | F2 | `POST /api/emergency/green-corridor`, `GET /api/emergency/signals`, `GET /api/emergency/hospitals` |
| `/transport` | `TransportPage.jsx` | F5 | `GET /api/transport/routes`, `GET /api/transport/live-positions`, `POST /api/transport/predict-delay` |
| `/narrator` | `NarratorPage.jsx` | F6 | `GET /api/narrator/logs`, `POST /api/narrator/broadcast-test` |
| `/sos-monitor` | `SOSMonitorPage.jsx` | F4 | `GET /api/emergency/sos/history`, `PUT /api/emergency/sos/{id}/status` |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `Layout.jsx` | Page wrapper with sidebar |
| `Sidebar.jsx` | Navigation sidebar with route links |
| `AlertBanner.jsx` | Floating banner showing live WebSocket alerts |
| `BaseMap.jsx` | Leaflet map wrapper centered on Chennai |
| `SeverityBadge.jsx` | Color-coded severity tag (LOW=green, MEDIUM=yellow, HIGH=red, CRITICAL=purple) |

### Hooks

| Hook | Purpose |
|------|---------|
| `useAlerts.js` | Connects to `ws://localhost:8000/ws/alerts`, returns `{alerts, latestNarrator}` |

---

## Mobile App Screens

| Tab | Screen | Features | Key API Calls |
|-----|--------|----------|---------------|
| 🔴 SOS | `SOSScreen.js` | GPS lock → 3-sec countdown → POST SOS → shows responder card | `POST /api/emergency/sos` |
| 🗺️ Map | `MapScreen.js` | Live map with incident markers + user location + 5s polling | `GET /api/highway/incidents` |
| 📊 Status | `StatusScreen.js` | SOS history list with status badges + 5s polling + pull-to-refresh | `GET /api/emergency/sos/history` |

### Mobile API Client
- Base URL: `http://10.0.2.2:8000` (Android emulator) or configurable via `expo-constants`
- Uses Axios with JSON content type

---

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate              # Windows
pip install -r requirements.txt
# Set your Gemini API key in .env
uvicorn main:app --host 0.0.0.0 --port 8000
```
- Health check: `GET http://localhost:8000/`
- Swagger docs: `http://localhost:8000/docs`
- DB auto-creates at `./db/intellimobility.db` with 200+ mock records

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Mobile
```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go app
```

### Demo Mode
```bash
cd backend
python demo.py
# Auto-triggers: Fatigue → Crash → SOS → Green Corridor → Narrator in 30s
```

---

## Google Stitch UI Integration Guide

To build a SaaS B2B-level UI in Google Stitch, connect to these backend APIs:

### Step 1: Point Stitch to Backend
Set the backend base URL to `http://localhost:8000` (or your deployed URL).

### Step 2: Create These Pages in Stitch

| Stitch Page | Data Sources | Key Widgets |
|-------------|-------------|-------------|
| **Command Center Dashboard** | `GET /api/urban/risk-scores` + `GET /api/heatmap/live-prediction` + `GET /api/urban/congestion` | Map with risk heatmap overlay, risk score table, congestion cards, stat counters |
| **Highway Monitoring** | `GET /api/highway/vehicles` + `GET /api/highway/incidents` | Live vehicle map, incident feed, simulate button → `POST /api/highway/simulate` |
| **Green Corridor Control** | `GET /api/emergency/hospitals` + `GET /api/emergency/signals` | Hospital selector → `POST /api/emergency/green-corridor`, signal state map, corridor route polyline |
| **SOS Control Room** | `GET /api/emergency/sos/history` | SOS report table with status dropdowns → `PUT /api/emergency/sos/{id}/status`, severity badges |
| **Public Transport Tracker** | `GET /api/transport/live-positions` + `GET /api/transport/routes` | Bus map with live positions, route table, delay predictor → `POST /api/transport/predict-delay` |
| **AI Narrator Feed** | `GET /api/narrator/logs` | Narrative cards with incident type tags, test broadcast button → `POST /api/narrator/broadcast-test` |

### Step 3: WebSocket Integration
Connect to `ws://localhost:8000/ws/alerts` for real-time push notifications:
- Show toast/banner on `INCIDENT` events
- Show corridor activation animation on `CORRIDOR_ACTIVATED`
- Show SOS alert on `SOS` events
- Show narrator text-to-speech on `NARRATOR` events

### Step 4: Key Data Shapes for Stitch Bindings

**Risk Scores** (for DataTable/Chart):
```
intersection_name | score | risk_level | factors[] | recommendation
```

**Vehicles** (for Map markers):
```
vehicle_id | lat | lng | speed | heading | status
```

**Incidents** (for Map markers + Feed):
```
id | type | severity | lat | lng | description | status | vehicle_id | created_at
```

**Bus Routes** (for Map polylines):
```
route_id | bus_id | origin | destination | current_lat | current_lng | delay_minutes | status
```

**Heatmap Predictions** (for Map heat layer):
```
predictions[]: lat | lng | risk_score | reason | accident_type
```

### Chennai-Specific Data
All mock data is centered on Chennai (13.0827°N, 80.2707°E) using real intersection names:
- Anna Salai - Gemini Flyover
- Mount Road - Cathedral Road Junction
- OMR - Thoraipakkam Signal
- ECR - Thiruvanmiyur Junction
- Kathipara Junction
- T Nagar - Panagal Park Signal
- And 9 more real intersections

### Hospital Coordinates (for Map)
| Hospital | Lat | Lng |
|----------|-----|-----|
| Apollo Hospital, Greams Road | 13.0612 | 80.2520 |
| Fortis Malar Hospital | 13.0045 | 80.2558 |
| MIOT International | 13.0156 | 80.2012 |
| Government General Hospital | 13.0780 | 80.2740 |
| Sri Ramachandra Hospital | 13.0355 | 80.1422 |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Google AI Studio API key for Gemini 2.0 Flash |
| `DATABASE_URL` | `sqlite:///./db/intellimobility.db` | SQLAlchemy database URL |
| `ENVIRONMENT` | `development` | Environment flag |
| `PORT` | `8000` | Server port |

---

## Endpoint Count Summary

| Category | Endpoints | Gemini-Powered |
|----------|-----------|----------------|
| Highway Safety (F1) | 4 | 2 |
| Green Corridor (F2) | 5 | 1 |
| Urban Dashboard (F3) | 4 | 2 |
| SOS System (F4) | 4 | 1 (via SOS submit) |
| Public Transport (F5) | 4 | 1 |
| AI Narrator (F6) | 3 | 2 |
| Predictive Heatmap (F7) | 3 | 2 |
| **Total** | **27 + WebSocket + Health** | **11 AI-powered** |