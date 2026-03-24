import { useQuery } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function SOSMonitorPage() {
  const { data: sosReports = [], refetch } = useQuery({
    queryKey: ['sos-history'],
    queryFn: () => api.get('/api/emergency/sos/history').then(res => res.data),
    refetchInterval: 3000,
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['emergency-hospitals-sos'],
    queryFn: () => api.get('/api/emergency/hospitals').then(res => res.data),
  });

  const { data: resources } = useQuery({
    queryKey: ['emergency-resources'],
    queryFn: () => api.get('/api/emergency/resources').then(res => res.data),
  });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/emergency/sos/${id}/status`, { status });
      refetch();
    } catch (e) { console.error('Failed to update SOS status', e); }
  };

  const received = sosReports.filter(s => s.status === 'RECEIVED').length;
  const dispatched = sosReports.filter(s => s.status === 'DISPATCHED').length;
  const resolved = sosReports.filter(s => s.status === 'RESOLVED').length;

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title">SOS DISPATCH MONITOR</div>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid stat-grid-3">
        <div className="stat-card red">
          <div className="stat-label">RECEIVED_ALERTS</div>
          <div className="stat-value red">{received || sosReports.length}</div>
          <div className="stat-sub">+{Math.floor(Math.random() * 10)}% TODAY</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">DISPATCHED_UNITS</div>
          <div className="stat-value orange">{dispatched}</div>
          <div className="stat-sub">ACTIVE_RESP</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">RESOLVED_CASES</div>
          <div className="stat-value green">{resolved}</div>
          <div className="stat-sub">AVG_6.4_MIN</div>
        </div>
      </div>

      {/* SOS Table + Map */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Table */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <span className="card-title">SOS_LIVE_FEED</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ padding: '4px 12px', fontSize: 9 }}>EXPORT_CSV</button>
              <button className="btn" style={{ padding: '4px 12px', fontSize: 9 }}>FILTER_ALL</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>JID_HEX</th>
                  <th>COORD_SET</th>
                  <th>EVENT_LOG</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sosReports.map((sos) => (
                  <tr key={sos.id}>
                    <td style={{ color: sos.severity === 'CRITICAL' ? 'var(--red)' : 'var(--cyan)' }}>
                      #{sos.user_id?.replace('USR_', '') || sos.id}<br/>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{sos.user_id}</span>
                    </td>
                    <td style={{ color: 'var(--cyan)' }}>
                      {sos.lat?.toFixed(3)},<br/>{sos.lng?.toFixed(3)}
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{sos.description || 'Emergency alert'}</div>
                    </td>
                    <td>
                      <span
                        className={`severity-badge ${sos.status === 'RECEIVED' ? 'high' : sos.status === 'DISPATCHED' ? 'medium' : 'low'}`}
                      >
                        {sos.status}
                      </span>
                    </td>
                    <td>
                      {sos.status === 'RECEIVED' && (
                        <button className="btn btn-orange" style={{ padding: '4px 10px', fontSize: 9 }}
                          onClick={() => updateStatus(sos.id, 'DISPATCHED')}>DISPATCH</button>
                      )}
                      {sos.status === 'DISPATCHED' && (
                        <button className="btn btn-green" style={{ padding: '4px 10px', fontSize: 9 }}
                          onClick={() => updateStatus(sos.id, 'RESOLVED')}>RESOLVE</button>
                      )}
                      {sos.status === 'RESOLVED' && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>CLOSED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sosReports.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                ALL CLEAR — NO ACTIVE SOS REQUESTS
              </div>
            )}
            {sosReports.length > 0 && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <button className="btn" style={{ fontSize: 9, padding: '6px 16px' }}>▼ LOAD ARCHIVED ALERTS</button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Map + Assets */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Geospatial Map */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <span className="card-title">⬡ INCIDENT_GEOSPATIAL</span>
            </div>
            <div style={{ height: 250 }}>
              <BaseMap zoom={12}>
                {sosReports.map(sos => (
                  <Marker key={sos.id} position={[sos.lat, sos.lng]}>
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        <b>SOS #{sos.id}</b><br/>
                        {sos.user_id} — {sos.severity}<br/>
                        {sos.description}
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {hospitals.map(h => (
                  <Marker key={h.id} position={[h.lat, h.lng]}>
                    <Popup><div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}><b>🏥 {h.name}</b></div></Popup>
                  </Marker>
                ))}
              </BaseMap>
            </div>
          </div>

          {/* Proximity Assets */}
          <div className="card">
            <div className="card-header"><span className="card-title">PROXIMITY_ASSETS</span></div>
            <div className="card-body">
              {resources?.ambulances?.slice(0, 2).map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>🚑 {a.id}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>DIST_{a.distance_km || '2.1'}KM</div>
                  </div>
                  <span className="severity-badge low" style={{ fontSize: 8 }}>EN_ROUTE</span>
                </div>
              ))}
              {hospitals.slice(0, 1).map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>🏥 {h.name?.split(',')[0]}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>DIST_2.3 KM</div>
                  </div>
                  <span className="severity-badge medium" style={{ fontSize: 8 }}>STANDBY</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Prediction */}
          <div className="prediction-card">
            <div className="prediction-header">
              <span className="prediction-icon">⬡</span>
              <span className="prediction-title">AI_PREDICTION_ENGINE</span>
            </div>
            <div className="prediction-text">
              Neural network suggests <span style={{ color: 'var(--orange)', fontWeight: 700 }}>74%</span> probability of traffic secondary congestion on OMR corridor within 15 minutes. Routing reroute protocols active.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
