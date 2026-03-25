import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function TransportPage() {
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState({});

  const { data: routes = [], refetch: refetchRoutes } = useQuery({
    queryKey: ['transport-live'],
    queryFn: () => api.get('/api/transport/live-positions').then(res => res.data),
    refetchInterval: 2000,
  });

  const handlePredictAll = async () => {
    setIsPredicting(true);
    try {
      const promises = routes.map(route =>
        api.post('/api/transport/predict-delay', {
          route_id: route.route_id,
          current_lat: route.current_lat,
          current_lng: route.current_lng,
        })
      );
      const results = await Promise.all(promises);
      const newPredictions = {};
      results.forEach(res => { newPredictions[res.data.route_id] = res.data; });
      setPredictions(newPredictions);
      refetchRoutes();
    } catch (e) { console.error('Prediction failed', e); }
    finally { setIsPredicting(false); }
  };

  const handlePredictSingle = async (route) => {
    setIsPredicting(true);
    try {
      const res = await api.post('/api/transport/predict-delay', {
        route_id: route.route_id,
        current_lat: route.current_lat,
        current_lng: route.current_lng,
      });
      setPredictions(prev => ({ ...prev, [route.route_id]: res.data }));
    } catch (e) { console.error('Prediction failed', e); }
    finally { setIsPredicting(false); }
  };

  const totalActive = routes.length;
  const onTimePercent = routes.length ? Math.round((routes.filter(r => r.delay_minutes <= 2 && r.status !== 'DELAYED').length / routes.length) * 100) : 0;
  const avgDelay = routes.length ? (routes.reduce((a, r) => a + (r.delay_minutes || 0), 0) / routes.length).toFixed(1) : 0;

  return (
    <div className="split-view">
      {/* LEFT: Map */}
      <div className="split-panel split-panel-left" style={{ position: 'relative' }}>
        {/* Live Coordinates Overlay */}
        <div className="map-overlay" style={{ top: 12, left: 12, zIndex: 500 }}>
          <div className="map-tag">
            <div className="map-tag-label">LIVE COORDINATES</div>
            <div className="map-tag-value">17.3850° N, 78.4867° E</div>
          </div>
        </div>

        <BaseMap zoom={12}>
          {routes.map(route => (
            <Marker key={route.route_id} position={[route.current_lat, route.current_lng]}>
              <Popup>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  <b>{route.route_id}</b> — {route.bus_id}<br/>
                  {route.origin} → {route.destination}<br/>
                  Status: {route.status} ({route.delay_minutes}m delay)
                </div>
              </Popup>
            </Marker>
          ))}
        </BaseMap>
      </div>

      {/* RIGHT: Fleet Data */}
      <div className="split-panel split-panel-right" style={{ padding: 20, overflowY: 'auto' }}>
        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <div className="page-title" style={{ fontSize: 18 }}>FLEET_TRACKER</div>
          <div className="page-subtitle">HYDERABAD METROPOLITAN TRANSPORT AUTHORITY</div>
        </div>

        {/* Fleet Stats */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5 }}>ACTIVE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 300, color: 'var(--text-primary)' }}>{totalActive > 100 ? '1,204' : totalActive}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5 }}>ON TIME</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 300, color: 'var(--green)' }}>{onTimePercent}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5 }}>DELAY AVC</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 300, color: 'var(--red)' }}>{avgDelay}m</div>
          </div>
        </div>

        {/* Live Fleet Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-primary)' }}>
            LIVE FLEET STATUS
          </div>
          <button className="btn btn-cyan" style={{ fontSize: 9, padding: '6px 12px' }} onClick={handlePredictAll} disabled={isPredicting}>
            {isPredicting ? '⟳' : '📡'} EXPORT CSV
          </button>
        </div>

        {/* Fleet Table Header */}
        <div style={{ display: 'flex', gap: 0, padding: '8px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          <span style={{ width: 70 }}>ROUTE</span>
          <span style={{ flex: 1 }}>EDITOR</span>
          <span style={{ width: 70 }}>DELAY</span>
          <span style={{ width: 80 }}>CONFIDENCE</span>
        </div>

        {/* Route Cards */}
        {routes.map(route => {
          const pred = predictions[route.route_id];
          const isDelayed = route.delay_minutes > 2 || route.status === 'DELAYED';

          return (
            <div key={route.route_id}>
              <div className="fleet-card">
                <div className="fleet-route-id">{route.route_id?.replace('R00', '') || route.route_id}</div>
                <div className="fleet-info">
                  <div className="fleet-name">{route.origin?.split(' ')[0]}...→{route.destination?.split(' ')[0]}...</div>
                  <div className="fleet-meta">ETA: {route.delay_minutes > 0 ? `+${route.delay_minutes}m` : 'ON_TIME'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={`fleet-status ${isDelayed ? 'delayed' : 'on-time'}`}>
                    {isDelayed ? `+${route.delay_minutes}m` : 'ON TIME'}
                  </span>
                  <button
                    className="btn btn-cyan"
                    style={{ fontSize: 9, padding: '4px 12px' }}
                    onClick={() => handlePredictSingle(route)}
                    disabled={isPredicting}
                  >
                    PREDICT
                  </button>
                </div>
              </div>

              {/* Expanded prediction */}
              {pred && (
                <div className="prediction-card" style={{ marginTop: -8, marginBottom: 12 }}>
                  <div className="prediction-header">
                    <span className="prediction-icon">⬡</span>
                    <span className="prediction-title">NEURAL PREDICTION RESULT:</span>
                  </div>
                  <div className="prediction-text">
                    {pred.reason}
                    <br/><br/>
                    <span style={{ color: 'var(--orange)' }}>Predicted Delay: {pred.predicted_delay_minutes}m ({pred.confidence})</span>
                    <br/>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{pred.recommendation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
