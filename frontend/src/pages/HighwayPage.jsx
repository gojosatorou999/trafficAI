import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function HighwayPage() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [trafficDensity, setTrafficDensity] = useState(88);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['highway-vehicles'],
    queryFn: () => api.get('/api/highway/vehicles').then(res => res.data),
    refetchInterval: 2000,
  });

  const { data: incidents = [], refetch: refetchIncidents } = useQuery({
    queryKey: ['highway-incidents'],
    queryFn: () => api.get('/api/highway/incidents').then(res => res.data),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const iv = setInterval(() => setTrafficDensity(75 + Math.floor(Math.random() * 20)), 5000);
    return () => clearInterval(iv);
  }, []);

  const handleSimulate = async (type) => {
    setIsSimulating(true);
    try {
      await api.post('/api/highway/simulate', { type });
      refetchIncidents();
    } catch (e) { console.error('Simulation failed', e); }
    finally { setIsSimulating(false); }
  };

  const getConfidenceColor = (conf) => {
    if (!conf) return 'var(--text-secondary)';
    const c = conf.toUpperCase();
    return c === 'HIGH' ? 'var(--red)' : c === 'MEDIUM' ? 'var(--orange)' : 'var(--green)';
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Map Section */}
      <div className="map-wrapper" style={{ flex: 1, position: 'relative', minHeight: 300 }}>
        {/* Traffic Density Overlay */}
        <div className="map-overlay" style={{ top: 12, left: 12 }}>
          <div className="map-tag">
            <div className="map-tag-label">TRAFFIC DENSITY</div>
            <div className="map-tag-value" style={{ fontSize: 20, fontWeight: 700 }}>
              {trafficDensity >= 80 ? 'HEAVY' : trafficDensity >= 50 ? 'MODERATE' : 'LIGHT'} [{trafficDensity}%]
            </div>
          </div>
        </div>

        <BaseMap zoom={13}>
          {vehicles.map(v => (
            <Marker key={v.vehicle_id} position={[v.lat, v.lng]}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <b>{v.vehicle_id}</b><br/>
                  Speed: {v.speed} km/h<br/>
                  Status: {v.status}<br/>
                  Heading: {v.heading}°
                </div>
              </Popup>
            </Marker>
          ))}
        </BaseMap>
      </div>

      {/* Bottom: Simulate + Feed side by side */}
      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        {/* Simulate Panel */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-primary)', marginBottom: 12 }}>
            SIMULATE INCIDENT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['CRASH', 'FATIGUE', 'SLOWDOWN', 'STATIONARY'].map(type => (
              <button
                key={type}
                className="btn-sim"
                onClick={() => handleSimulate(type)}
                disabled={isSimulating}
                style={type === 'CRASH' ? { borderColor: 'var(--red)', color: 'var(--red)' } : {}}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Live Incident Feed */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 240 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-primary)', marginBottom: 12 }}>
            LIVE INCIDENT FEED
          </div>
          {incidents.slice(0, 8).map((inc) => {
            const isHigh = inc.severity === 'HIGH' || inc.severity === 'CRITICAL';
            const confPercent = inc.confidence === 'HIGH' ? 98 : inc.confidence === 'MEDIUM' ? 72 : 45;
            return (
              <div key={inc.id} className={`incident-card ${isHigh ? '' : 'medium'}`} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="incident-type" style={{ color: isHigh ? 'var(--red)' : 'var(--orange)' }}>
                      {isHigh ? 'CRITICAL INCIDENT' : 'DRIVER ALERT'}
                    </div>
                    <div className="incident-title">{inc.type}: {inc.vehicle_id}</div>
                  </div>
                  <span className={`severity-badge ${isHigh ? 'high' : 'medium'}`}>{inc.severity}</span>
                </div>
                <div className="incident-meta">
                  LOC: {inc.lat?.toFixed(2)}N {inc.lng?.toFixed(2)}E &nbsp;|&nbsp; TS: {inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : '—'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: getConfidenceColor(inc.confidence) }}>CONFIDENCE SCORE</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: getConfidenceColor(inc.confidence) }}>{confPercent}%</span>
                </div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${confPercent}%`, background: getConfidenceColor(inc.confidence) }} />
                </div>
              </div>
            );
          })}
          {incidents.length === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', padding: 30 }}>
              NO ACTIVE INCIDENTS
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar" style={{ marginTop: 0 }}>
        <div className="status-indicator">
          <span className="status-dot" style={{ background: 'var(--orange)', boxShadow: '0 0 8px var(--orange)' }} />
          <span style={{ color: 'var(--orange)' }}>AI ENGINE: STABLE</span>
        </div>
        <span style={{ color: 'var(--text-secondary)' }}>LATENCY: {Math.floor(12 + Math.random() * 8)}MS</span>
        <span style={{ color: 'var(--text-secondary)' }}>LOAD: {(0.3 + Math.random() * 0.4).toFixed(2)}%</span>
      </div>
    </div>
  );
}
