import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Circle, Popup } from 'react-leaflet';
import { Activity, MapPin, AlertTriangle } from 'lucide-react';
import api from '../api/client';
import BaseMap from '../components/BaseMap';
import SeverityBadge from '../components/SeverityBadge';
import useAlerts from '../hooks/useAlerts';

function StatCard({ label, value, icon: Icon, color = "text-teal-500" }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
      <div className={`p-3 rounded-lg bg-slate-50 mr-4 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { alerts } = useAlerts();
  const [mapMode, setMapMode] = useState('predictive');

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

  const congestionColors = {
    LOW: { color: '#eab308', fillColor: '#fef08a', fillOpacity: 0.3 },
    MEDIUM: { color: '#f97316', fillColor: '#fed7aa', fillOpacity: 0.4 },
    HIGH: { color: '#ef4444', fillColor: '#fecaca', fillOpacity: 0.5 },
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 shrink-0">
        <StatCard label="Avg City Risk Score" value={Math.round(riskScores.reduce((acc, s) => acc + s.score, 0) / (riskScores.length || 1)) + '/100'} icon={Activity} />
        <StatCard label="Total Incidents Today" value="200" icon={AlertTriangle} color="text-red-500" />
        <StatCard label="Active High-Risk Zones" value={congestion.filter(c => c.level === 'HIGH').length} icon={MapPin} color="text-orange-500" />
        <StatCard label="Active WebSocket Alerts" value={alerts.length} icon={Activity} color="text-blue-500" />
      </div>

      <div className="flex flex-1 flex-col md:flex-row gap-6 px-6 pb-6 min-h-0">
        {/* Main Map Area */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h2 className="text-lg font-semibold text-slate-800">Traffic Risk Map</h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setMapMode('predictive')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mapMode === 'predictive' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                AI Predictive Map
              </button>
              <button
                onClick={() => setMapMode('historical')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mapMode === 'historical' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Historical Heatmap
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <BaseMap>
              {/* Congestion Zones */}
              {congestion.map((zone) => (
                <Circle
                  key={zone.zone_id}
                  center={[zone.lat, zone.lng]}
                  radius={zone.radius_m}
                  pathOptions={congestionColors[zone.level] || congestionColors.LOW}
                >
                  <Popup>
                    <div className="font-semibold">{zone.name}</div>
                    <div className="text-sm">Traffic: {zone.level}</div>
                    <div className="text-sm">Avg Speed: {zone.avg_speed_kmh} km/h</div>
                  </Popup>
                </Circle>
              ))}

              {/* Risk Score Intersections */}
              {riskScores.map((score) => (
                <Marker key={score.intersection_id} position={[score.lat, score.lng]}>
                  <Popup>
                    <div className="font-semibold">{score.intersection_name}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm">Risk Score:</span>
                      <SeverityBadge severity={score.risk_level} />
                    </div>
                    <div className="text-2xl font-bold my-1 text-center">{score.score}/100</div>
                    <p className="text-xs text-slate-600 mt-2 font-medium">AI Analysis:</p>
                    <ul className="text-xs list-disc pl-4 text-slate-500">
                      {score.factors?.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <p className="text-xs mt-2 italic border-t pt-1">{score.recommendation}</p>
                  </Popup>
                </Marker>
              ))}
            </BaseMap>

            {/* Floating Gemini Prediction Summary */}
            {mapMode === 'predictive' && heatmapData?.summary && (
              <div className="absolute top-4 left-4 right-4 z-[400] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="bg-gradient-to-br from-teal-400 to-blue-500 p-2 rounded-lg text-white font-bold text-xs shrink-0">
                    Gemini 2.5
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Predictive AI Analysis</h3>
                    <p className="text-sm text-slate-600">{heatmapData.summary}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full md:w-96 flex flex-col gap-6 shrink-0">
          {/* Risk Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-1/2 min-h-[300px]">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-800">Highest Risk Intersections</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {riskScores.slice(0, 5).map((score) => (
                  <div key={score.intersection_id} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700 truncate pr-2">{score.intersection_name}</span>
                      <span className="font-bold text-sm">{score.score}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${score.score >= 80 ? 'bg-red-500' : score.score >= 60 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                        style={{ width: `${score.score}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Narrator Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-1/2 min-h-[300px]">
            <div className="p-4 border-b border-slate-100 shrink-0 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Live AI Narratives</h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {narratorLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <SeverityBadge severity={log.severity} />
                    <span className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-2">{log.narrative}</p>
                </div>
              ))}
              {narratorLogs.length === 0 && (
                <div className="text-sm text-center text-slate-500 py-8">No broadcasts active.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
