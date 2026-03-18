"""
SQLAlchemy ORM models for IntelliMobility AI.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone

DATABASE_URL = "sqlite:///./db/intellimobility.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI to get a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(50), nullable=False)  # CRASH, FATIGUE, SLOWDOWN, STATIONARY, WRONG_ROUTE
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, RESOLVED
    vehicle_id = Column(String(50), nullable=True)
    confidence = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    alerts = relationship("Alert", back_populates="incident")
    narrator_logs = relationship("NarratorLog", back_populates="incident")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    message = Column(Text, nullable=False)
    sent_to = Column(String(200), nullable=True)
    channel = Column(String(50), nullable=True)  # WEBSOCKET, SMS, EMAIL
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    incident = relationship("Incident", back_populates="alerts")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String(50), unique=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    status = Column(String(20), default="MOVING")  # MOVING, STOPPED, ALERT
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TrafficSignal(Base):
    __tablename__ = "traffic_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signal_id = Column(String(50), unique=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    state = Column(String(20), default="NORMAL")  # NORMAL, GREEN, RED
    green_corridor_active = Column(Boolean, default=False)
    intersection_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BusRoute(Base):
    __tablename__ = "bus_routes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    route_id = Column(String(50), unique=True, nullable=False)
    bus_id = Column(String(50), nullable=False)
    origin = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    delay_minutes = Column(Integer, default=0)
    status = Column(String(20), default="ON_TIME")  # ON_TIME, DELAYED, EARLY
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    intersection_id = Column(String(50), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    score = Column(Integer, default=0)
    factors = Column(Text, nullable=True)  # JSON string of factors list
    risk_level = Column(String(20), nullable=True)
    recommendation = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SOSReport(Base):
    __tablename__ = "sos_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="HIGH")
    status = Column(String(20), default="RECEIVED")  # RECEIVED, DISPATCHED, RESOLVED
    responder_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class NarratorLog(Base):
    __tablename__ = "narrator_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True)
    narrative = Column(Text, nullable=False)
    incident_type = Column(String(50), nullable=True)
    severity = Column(String(20), nullable=True)
    broadcast_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    incident = relationship("Incident", back_populates="narrator_logs")


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)
