import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup, Polyline } from 'react-leaflet';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function GreenCorridorPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  const { data: signals = [], refetch: refetchSignals } = useQuery({
    queryKey: ['emergency-signals'],
    queryFn: () => api.get('/api/emergency/signals').then(res => res.data),
    refetchInterval: 3000,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['emergency-hospitals'],
    queryFn: () => api.get('/api/emergency/hospitals').then(res => res.data),
  });

  const handleActivate = async () => {
    if (!origin || !destination) return;
    setIsActivating(true);
    try {
      const originLat = 13.0418;
      const originLng = 80.2341;
      const targetHosp = hospitals.find(h => h.id.toString() === destination);
      if (!targetHosp) return;

      const res = await api.post('/api/emergency/green-corridor', {
        ambulance_lat: originLat, ambulance_lng: originLng,
        hospital_lat: targetHosp.lat, hospital_lng: targetHosp.lng,
      });
      setActivePlan(res.data);
      refetchSignals();
    } catch (e) { console.error('Failed to activate corridor', e); }
    finally { setIsActivating(false); }
  };

  const handleReset = async () => {
    await api.post('/api/emergency/reset-corridor');
    setActivePlan(null);
    setOrigin('');
    setDestination('');
    refetchSignals();
  };

  const routePositions = activePlan?.route?.map(wp => [wp.lat, wp.lng]) || [];

  return (
    <div className="split-view">
      {/* LEFT: Map */}
      <div className="split-panel split-panel-left" style={{ position: 'relative' }}>
        {activePlan && (
          <div className="map-overlay" style={{ top: 12, left: 12, zIndex: 500 }}>
            <div className="map-tag" style={{ borderColor: 'rgba(16,185,129,0.4)' }}>
              <div className="map-tag-label" style={{ color: 'var(--green)' }}>🚑 CORRIDOR ACTIVE</div>
              <div className="map-tag-value" style={{ color: 'var(--green)' }}>
                ETA: {activePlan.estimated_minutes}min • {activePlan.distance_km}km
              </div>
            </div>
          </div>
        )}

        <BaseMap zoom={13}>
          {signals.map(sig => (
            <Marker key={sig.signal_id} position={[sig.lat, sig.lng]}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <b>{sig.intersection_name}</b><br/>
                  State: <span style={{ color: sig.state === 'GREEN' ? 'var(--green)' : 'var(--red)' }}>{sig.state}</span><br/>
                  {sig.green_corridor_active && <span style={{ color: 'var(--green)' }}>★ Override Active</span>}
                </div>
              </Popup>
            </Marker>
          ))}
          {activePlan?.route && (
            <Polyline positions={routePositions} color="#10b981" weight={5} opacity={0.8} dashArray="10, 10" />
          )}
          {activePlan && routePositions.length > 0 && (
            <Marker position={routePositions[routePositions.length - 1]}>
              <Popup><div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}><b>🏥 Destination Hospital</b></div></Popup>
            </Marker>
          )}
        </BaseMap>
      </div>

      {/* RIGHT: Controls */}
      <div className="split-panel split-panel-right" style={{ padding: 20, overflowY: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="page-title" style={{ fontSize: 18 }}>GREEN CORRIDOR</div>
          <div className="page-subtitle">Emergency vehicle signal preemption system</div>
        </div>

        {!activePlan ? (
          <div>
            {/* Origin */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">AMBULANCE ORIGIN</label>
              <select className="form-select" value={origin} onChange={e => setOrigin(e.target.value)}>
                <option value="">Select origin...</option>
                <option value="T Nagar">T Nagar (AMB_001)</option>
                <option value="Anna Salai">Anna Salai (AMB_002)</option>
              </select>
            </div>

            {/* Destination */}
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">TARGET HOSPITAL</label>
              <select className="form-select" value={destination} onChange={e => setDestination(e.target.value)}>
                <option value="">Select destination...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            {/* Activate Button */}
            <button
              className="btn btn-green"
              style={{ width: '100%', padding: '14px 20px', fontSize: 12 }}
              onClick={handleActivate}
              disabled={!origin || !destination || isActivating}
            >
              {isActivating ? '⟳ OPTIMIZING ROUTE...' : '⚡ ACTIVATE OVERRIDE'}
            </button>

            {/* Signal Status */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header"><span className="card-title">SIGNAL_STATUS</span></div>
              <div className="card-body" style={{ maxHeight: 250, overflowY: 'auto' }}>
                {signals.map(sig => (
                  <div key={sig.signal_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-primary)' }}>{sig.intersection_name?.slice(0, 25)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: sig.state === 'GREEN' ? 'var(--green)' : 'var(--red)' }}>
                      {sig.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Corridor Summary */
          <div>
            <div className="corridor-active-panel" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>✓</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>CORRIDOR ACTIVE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>Signals synced. Route locked for AMB_001.</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stat-grid stat-grid-2" style={{ marginBottom: 16 }}>
              <div className="stat-card green">
                <div className="stat-label">EST. TIME</div>
                <div className="stat-value green">{activePlan.estimated_minutes}<span style={{ fontSize: 14, marginLeft: 4 }}>min</span></div>
              </div>
              <div className="stat-card">
                <div className="stat-label">DISTANCE</div>
                <div className="stat-value">{activePlan.distance_km}<span style={{ fontSize: 14, marginLeft: 4 }}>km</span></div>
              </div>
            </div>

            {/* AI Narrative */}
            <div className="prediction-card" style={{ marginBottom: 16 }}>
              <div className="prediction-header">
                <span className="prediction-icon">⬡</span>
                <span className="prediction-title">GEMINI 2.5 ROUTING</span>
              </div>
              <div className="prediction-text" style={{ fontStyle: 'italic', borderLeft: '2px solid var(--cyan)', paddingLeft: 12 }}>
                "{activePlan.narrative}"
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)', marginBottom: 6 }}>CLEARED INTERSECTIONS:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {activePlan.route.map((wp, i) => (
                    <span key={i} className="corridor-waypoint">{wp.intersection_name}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Reset */}
            <button className="btn btn-red" style={{ width: '100%', padding: '12px 20px' }} onClick={handleReset}>
              ■ END MISSION & RESET SIGNALS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
