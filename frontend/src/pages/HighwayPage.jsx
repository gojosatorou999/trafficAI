import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup } from 'react-leaflet';
import { AlertCircle, Zap } from 'lucide-react';
import api from '../api/client';
import BaseMap from '../components/BaseMap';
import SeverityBadge from '../components/SeverityBadge';

export default function HighwayPage() {
  const [isSimulating, setIsSimulating] = useState(false);

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

  const handleSimulate = async (type) => {
    setIsSimulating(true);
    try {
      await api.post('/api/highway/simulate', { type });
      refetchIncidents();
    } catch (e) {
      console.error('Simulation failed', e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar: Incident Feed */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-sm shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" /> Live Incidents
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {incidents.slice(0, 10).map((inc) => (
            <div key={inc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <SeverityBadge severity={inc.severity} />
                <span className="text-xs font-medium text-slate-500">{inc.vehicle_id}</span>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1">{inc.type}</h3>
              <p className="text-sm text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-100 italic">
                {inc.description}
              </p>
              <div className="mt-2 text-xs text-slate-400">
                AI Confidence: <span className="font-semibold text-slate-500">{inc.confidence}</span>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">No active incidents.</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Action Bar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-center gap-4 px-6 absolute top-0 inset-x-0 z-[400] bg-opacity-90 backdrop-blur">
          <span className="text-sm font-semibold text-slate-600 mr-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Demo Triggers:
          </span>
          {['FATIGUE', 'CRASH', 'SLOWDOWN', 'STATIONARY'].map(type => (
            <button
              key={type}
              onClick={() => handleSimulate(type)}
              disabled={isSimulating}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition disabled:opacity-50"
            >
              Simulate {type}
            </button>
          ))}
        </div>

        {/* Full screen map */}
        <div className="flex-1">
          <BaseMap>
            {/* Vehicles Layer */}
            {vehicles.map(v => (
              <Marker key={v.vehicle_id} position={[v.lat, v.lng]}>
                <Popup>
                  <div className="font-semibold">{v.vehicle_id}</div>
                  <div className="text-sm">Speed: {v.speed} km/h</div>
                  <div className="text-sm">Status: {v.status}</div>
                </Popup>
              </Marker>
            ))}
          </BaseMap>
        </div>
      </div>
    </div>
  );
}
