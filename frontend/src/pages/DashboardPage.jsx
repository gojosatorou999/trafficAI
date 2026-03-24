import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Circle, Popup } from 'react-leaflet';
import api from '../api/client';
import BaseMap from '../components/BaseMap';
import SeverityBadge from '../components/SeverityBadge';
import useAlerts from '../hooks/useAlerts';

export default function DashboardPage() {
  const { alerts } = useAlerts();
  const [mapMode, setMapMode] = useState('predictive');
  const [telemetry, setTelemetry] = useState({ cpu: 0, latency: 0, network: '5G_ENH' });

  const { data: riskScores = [] } = useQuery({
    queryKey: ['risk-scores'],
    queryFn: () => api.get('/api/urban/risk-scores').then(res => res.data),
    refetchInterval: 10000,
  });

  const { data: congestion = [] } = useQuery({
    queryKey: ['congestion'],
    queryFn: () => api.get('/api/urban/congestion').then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: heatmapData } = useQuery({
    queryKey: ['heatmap', mapMode],
    queryFn: () =>
      mapMode === 'historical'
        ? api.get('/api/heatmap/historical').then(res => res.data)
        : api.get('/api/heatmap/live-prediction').then(res => res.data),
    refetchInterval: 60000,
  });

  const { data: narratorLogs = [] } = useQuery({
    queryKey: ['narrator-logs'],
    queryFn: () => api.get('/api/narrator/logs').then(res => res.data),
    refetchInterval: 5000,
  });

  const { data: sosReports = [] } = useQuery({
    queryKey: ['sos-history-dash'],
    queryFn: () => api.get('/api/emergency/sos/history').then(res => res.data),
    refetchInterval: 10000,
  });

  // Simulated telemetry
  useEffect(() => {
    const iv = setInterval(() => {
      setTelemetry({
        cpu: (8 + Math.random() * 12).toFixed(1),
        latency: Math.floor(14 + Math.random() * 20),
        network: '5G_ENH',
      });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const avgScore = riskScores.length ? Math.round(riskScores.reduce((a, s) => a + s.score, 0) / riskScores.length) : 0;
  const highRiskCount = riskScores.filter(s => s.score >= 70).length;
  const predictionCount = heatmapData?.predictions?.length || 0;
  const sosCount = sosReports.filter(s => s.status !== 'RESOLVED').length;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">LIVE SYSTEM FEED</div>
          <div className="page-subtitle">Real-time monitoring • Chennai Metropolitan Area</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid stat-grid-4">
        <div className="stat-card">
          <div className="stat-label">ACTIVE INCIDENTS</div>
          <div className="stat-value">{String(avgScore).padStart(2, '0')}</div>
          <div className="stat-sub">↑ {Math.floor(Math.random() * 15)}%</div>
          <div className="stat-icon">📊</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">HIGH RISK ZONES</div>
          <div className="stat-value orange">{String(highRiskCount).padStart(2, '0')}</div>
          <div className="stat-sub">STABLE</div>
          <div className="stat-icon">⚠</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">SOS REQUESTS</div>
          <div className="stat-value red">{String(sosCount).padStart(2, '0')}</div>
          <div className="stat-sub">RESP_{Math.floor(3 + Math.random() * 5)}M</div>
          <div className="stat-icon">🔔</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">AI PREDICTIONS</div>
          <div className="stat-value" style={{ color: 'var(--purple)' }}>{predictionCount || riskScores.length}</div>
          <div className="stat-sub">CONF_{heatmapData?.confidence === 'HIGH' ? '98' : '85'}%</div>
          <div className="stat-icon">⚙</div>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          {/* Map Mode Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button className={`btn ${mapMode === 'predictive' ? 'btn-cyan' : ''}`} onClick={() => setMapMode('predictive')}>
              AI PREDICTIVE
            </button>
            <button className={`btn ${mapMode === 'historical' ? 'btn-cyan' : ''}`} onClick={() => setMapMode('historical')}>
              HISTORICAL
            </button>
          </div>

          <div className="map-wrapper" style={{ flex: 1, position: 'relative' }}>
            {/* Floating coords */}
            <div className="map-overlay" style={{ top: 12, left: 12 }}>
              <div className="map-tag">
                <div className="map-tag-label">LIVE COORDINATES</div>
                <div className="map-tag-value">13.0827° N, 80.2707° E</div>
              </div>
            </div>

            {/* Floating AI summary */}
            {mapMode === 'predictive' && heatmapData?.summary && (
              <div className="map-overlay" style={{ bottom: 12, left: 12, right: 12 }}>
                <div className="map-tag" style={{ pointerEvents: 'auto' }}>
                  <div className="map-tag-label">⬡ ANOMALY DETECTION</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {heatmapData.summary}
                  </div>
                </div>
              </div>
            )}

            <BaseMap>
              {congestion.map((zone) => (
                <Circle
                  key={zone.zone_id}
                  center={[zone.lat, zone.lng]}
                  radius={zone.radius_m}
                  pathOptions={{
                    color: zone.level === 'HIGH' ? '#ef4444' : zone.level === 'MEDIUM' ? '#f59e0b' : '#10b981',
                    fillColor: zone.level === 'HIGH' ? '#ef4444' : zone.level === 'MEDIUM' ? '#f59e0b' : '#10b981',
                    fillOpacity: 0.15, weight: 1,
                  }}
                >
                  <Popup><div style={{fontFamily:'var(--font-mono)',fontSize:11}}><b>{zone.name}</b><br/>Level: {zone.level}<br/>Avg Speed: {zone.avg_speed_kmh} km/h</div></Popup>
                </Circle>
              ))}
              {riskScores.map((score) => (
                <Marker key={score.intersection_id} position={[score.lat, score.lng]}>
                  <Popup>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:11}}>
                      <b>{score.intersection_name}</b><br/>
                      Risk: {score.score}/100 ({score.risk_level})<br/>
                      {score.factors?.map((f, i) => <div key={i}>• {f}</div>)}
                      <i style={{fontSize:10,marginTop:4,display:'block'}}>{score.recommendation}</i>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </BaseMap>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
          {/* Risk Leaderboard */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <span className="card-title">RISK_INTERSECTIONS</span>
            </div>
            <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
              {riskScores.slice(0, 6).map((s) => (
                <div key={s.intersection_id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)' }}>{s.intersection_name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: s.score >= 80 ? 'var(--red)' : s.score >= 60 ? 'var(--orange)' : 'var(--cyan)' }}>{s.score}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.score}%`, borderRadius: 2, background: s.score >= 80 ? 'var(--red)' : s.score >= 60 ? 'var(--orange)' : 'var(--cyan)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry */}
          <div className="telemetry-panel">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-secondary)', marginBottom: 8 }}>SYSTEM_TELEMETRY</div>
            <div className="telemetry-row"><span className="telemetry-label">CPU_LOAD:</span><span className="telemetry-value">{telemetry.cpu}%</span></div>
            <div className="telemetry-row"><span className="telemetry-label">DATA_LATENCY:</span><span className="telemetry-value">{telemetry.latency}MS</span></div>
            <div className="telemetry-row"><span className="telemetry-label">NETWORK:</span><span className="telemetry-value">{telemetry.network}</span></div>
          </div>

          {/* Narrator Mini */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">LIVE NARRATIVES</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
            </div>
            <div className="card-body" style={{ maxHeight: 180, overflowY: 'auto' }}>
              {narratorLogs.slice(0, 3).map((log) => (
                <div key={log.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <SeverityBadge severity={log.severity} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.5 }}>{log.narrative?.slice(0, 120)}...</p>
                </div>
              ))}
              {narratorLogs.length === 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>NO ACTIVE BROADCASTS</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className="status-dot stable" />
          <span style={{ color: 'var(--green)' }}>AI ENGINE: STABLE</span>
        </div>
        <span style={{ color: 'var(--text-secondary)' }}>LATENCY: {telemetry.latency}MS</span>
        <span style={{ color: 'var(--text-secondary)' }}>LOAD: {telemetry.cpu}%</span>
      </div>
    </div>
  );
}
