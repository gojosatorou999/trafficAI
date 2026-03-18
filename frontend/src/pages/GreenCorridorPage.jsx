import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Marker, Popup, Polyline } from 'react-leaflet';
import { Activity, Clock, MoreHorizontal, Power, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import BaseMap from '../components/BaseMap';

export default function GreenCorridorPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  // Poll signals
  const { data: signals = [], refetch: refetchSignals } = useQuery({
    queryKey: ['emergency-signals'],
    queryFn: () => api.get('/api/emergency/signals').then(res => res.data),
    refetchInterval: 3000,
  });

  // Fetch hospitals for dropdown
  const { data: hospitals = [] } = useQuery({
    queryKey: ['emergency-hospitals'],
    queryFn: () => api.get('/api/emergency/hospitals').then(res => res.data),
  });

  const handleActivate = async () => {
    if (!origin || !destination) return;
    setIsActivating(true);
    try {
      // Mock origin coordinates (Ambulance in T Nagar)
      const originLat = 13.0418;
      const originLng = 80.2341;
      
      const targetHosp = hospitals.find(h => h.id.toString() === destination);
      if (!targetHosp) return;

      const res = await api.post('/api/emergency/green-corridor', {
        ambulance_lat: originLat,
        ambulance_lng: originLng,
        hospital_lat: targetHosp.lat,
        hospital_lng: targetHosp.lng,
      });
      
      setActivePlan(res.data);
      refetchSignals();
    } catch (e) {
      console.error('Failed to activate corridor', e);
    } finally {
      setIsActivating(false);
    }
  };

  const handleReset = async () => {
    await api.post('/api/emergency/reset-corridor');
    setActivePlan(null);
    setOrigin('');
    setDestination('');
    refetchSignals();
  };

  // Convert route into Polyline positions
  const routePositions = activePlan?.route?.map(wp => [wp.lat, wp.lng]) || [];

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 bg-emerald-50/50">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Green Corridor</h2>
          <p className="text-sm text-slate-500">
            Emergency vehicle prioritization via dynamic signal preemption.
          </p>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Form */}
          {!activePlan ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Ambulance Origin</label>
                <select 
                  className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6 bg-white"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                >
                  <option value="">Select origin...</option>
                  <option value="T Nagar">T Nagar (AMB_001)</option>
                  <option value="Anna Salai">Anna Salai (AMB_002)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-slate-900 mb-1">Target Hospital</label>
                <select 
                  className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-emerald-600 sm:text-sm sm:leading-6 bg-white"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                >
                  <option value="">Select destination...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleActivate}
                disabled={!origin || !destination || isActivating}
                className="w-full mt-4 flex justify-center items-center gap-2 rounded-md bg-emerald-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 transition-colors"
              >
                {isActivating ? <MoreHorizontal className="w-5 h-5 animate-pulse" /> : <Power className="w-5 h-5" />}
                {isActivating ? 'Optimizing Route...' : 'Activate Override'}
              </button>
            </div>
          ) : (
            /* Active Plan Summary */
            <div className="space-y-6">
              <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-900">Corridor Active</h3>
                  <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
                    Signals synced. Route locked for AMB_001.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Est. Time</div>
                  <div className="text-3xl font-bold text-slate-900">{activePlan.estimated_minutes}<span className="text-base font-medium text-slate-500 ml-1">min</span></div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Distance</div>
                  <div className="text-3xl font-bold text-slate-900">{activePlan.distance_km}<span className="text-base font-medium text-slate-500 ml-1">km</span></div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Gemini 2.5 Routing</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-teal-500 pl-3 py-1">
                  "{activePlan.narrative}"
                </p>
                
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Cleared Intersections:</div>
                  <div className="flex flex-wrap gap-2">
                    {activePlan.route.map((wp, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-slate-700/50 text-slate-300 text-[10px] font-mono border border-slate-600">
                        {wp.intersection_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full flex justify-center rounded-md bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 hover:text-red-600 transition-colors"
              >
                End Mission & Reset Signals
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative z-0">
        <BaseMap>
          {/* Signal Markers */}
          {signals.map(sig => {
            const isGreen = sig.state === 'GREEN';
            return (
              <Marker key={sig.signal_id} position={[sig.lat, sig.lng]}>
                <Popup>
                  <p className="font-semibold text-slate-800">{sig.intersection_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-slate-500 font-medium">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${isGreen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {sig.state}
                    </span>
                  </div>
                  {sig.green_corridor_active && (
                    <p className="text-xs text-emerald-600 font-semibold mt-2 animate-pulse bg-emerald-50 px-2 py-1 rounded inline-block">
                      ★ Override Active
                    </p>
                  )}
                </Popup>
              </Marker>
            );
          })}

          {/* Active Route Polyline */}
          {activePlan?.route && (
            <Polyline 
              positions={routePositions} 
              color="#10b981" 
              weight={6} 
              opacity={0.8}
              dashArray="10, 10"
              className="animate-pulse"
            />
          )}

          {/* Start/End Markers */}
          {activePlan && routePositions.length > 0 && (
            <>
              {/* Fake Hospital Marker */}
              <Marker position={routePositions[routePositions.length - 1]}>
                <Popup>Destination Hospital</Popup>
              </Marker>
            </>
          )}
        </BaseMap>
      </div>
    </div>
  );
}
